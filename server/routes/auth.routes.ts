import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { loginUserSchema } from "@shared/schema";
import { z } from "zod";
import { generateToken } from "../auth";
import { getUploadMiddleware } from "../uploadMiddleware";
import fs from 'fs';

/**
 * Authentication routes for login and registration
 */
export function authRoutes(app: Express): void {
  // Login route
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = loginUserSchema.parse(req.body);
      
      // Verify credentials
      const user = await storage.verifyLogin(validatedData.email, validatedData.password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Generate JWT token
      const token = generateToken(user);
      
      // Return success with token
      return res.status(200).json({ 
        message: "Login successful",
        userId: user.id,
        userType: user.userType,
        token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Individual user registration
  app.post("/api/auth/register/individual", async (req: Request, res: Response) => {
    try {
      // Create validation schema for individual registration
      const individualSchema = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        confirmPassword: z.string(),
        phone: z.string().min(1, { message: "Phone number is required" }),
        address: z.string().min(1, { message: "Address is required" }),
        termsAccepted: z.literal(true)
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      });
      
      // Validate request body
      const validatedData = individualSchema.parse(req.body);
      
      // Remove fields not needed for user creation and ensure required fields
      const { confirmPassword, termsAccepted, ...userData } = validatedData;
      
      // After Zod validation, phone and address are guaranteed to exist
      // Explicitly define user data with required fields to satisfy TypeScript
      const userToCreate = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        phone: userData.phone,     // This is now guaranteed to exist after validation
        address: userData.address  // This is now guaranteed to exist after validation
      };
      
      // Create the user
      const user = await storage.createIndividualUser(userToCreate);
      
      // Generate JWT token
      const token = generateToken(user);
      
      // Return success with token
      return res.status(201).json({ 
        message: "User registered successfully",
        userId: user.id,
        userType: user.userType,
        token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Business user registration
  app.post("/api/auth/register/business", 
    getUploadMiddleware().fields([
      { name: 'governmentId', maxCount: 1 },
      { name: 'proofOfAddress', maxCount: 1 },
      { name: 'proofOfBusiness', maxCount: 1 }
    ]),
    async (req: Request, res: Response) => {
    try {
      // Handle form data
      const businessName = req.body.businessName;
      const businessCategory = req.body.businessCategory;
      const firstName = req.body.firstName;
      const lastName = req.body.lastName;
      const email = req.body.email;
      const password = req.body.password;
      const phone = req.body.phone;
      const address = req.body.address;
      const termsAccepted = req.body.termsAccepted === 'true';
      
      // Validate core user data
      if (!businessName || !businessCategory || !firstName || !lastName || 
          !email || !password || !phone || !address || !termsAccepted) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Type assertion for multer files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Check for all required file uploads
      if (!files.governmentId?.[0] || !files.proofOfAddress?.[0] || !files.proofOfBusiness?.[0]) {
        return res.status(400).json({ message: "Missing required document uploads" });
      }

      // Get file paths/URLs
      const governmentIdPath = files.governmentId[0].path;
      const proofOfAddressPath = files.proofOfAddress[0].path;
      const proofOfBusinessPath = files.proofOfBusiness[0].path;
      
      // Create user with business
      const user = await storage.createBusinessUser(
        {
          firstName,
          lastName,
          email,
          password,
          phone,
          address
        },
        {
          businessName,
          businessCategory,
          governmentId: governmentIdPath,
          proofOfAddress: proofOfAddressPath,
          proofOfBusiness: proofOfBusinessPath,
          verificationStatus: "pending"
        }
      );
      
      // Generate JWT token
      const token = generateToken(user);
      
      // Return success with token
      return res.status(201).json({ 
        message: "Business registered successfully",
        userId: user.id,
        userType: user.userType,
        token
      });
    } catch (error) {
      // Clean up any uploaded files in case of error
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files) {
        Object.values(files).forEach(fileArray => {
          fileArray.forEach(file => {
            if (file.path && fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        });
      }

      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Business registration error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
}