import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginUserSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = loginUserSchema.parse(req.body);
      
      // Verify credentials
      const user = await storage.verifyLogin(validatedData.email, validatedData.password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Return success (would normally set session/JWT here)
      return res.status(200).json({ 
        message: "Login successful",
        userId: user.id,
        userType: user.userType
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
      const individualSchema = insertUserSchema.omit({ id: true, username: true, userType: true, created_at: true })
        .extend({
          confirmPassword: z.string(),
          termsAccepted: z.literal(true)
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords don't match",
          path: ["confirmPassword"],
        });
      
      // Validate request body
      const validatedData = individualSchema.parse(req.body);
      
      // Remove fields not needed for user creation
      const { confirmPassword, termsAccepted, ...userData } = validatedData;
      
      // Create the user
      const user = await storage.createIndividualUser(userData);
      
      // Return success
      return res.status(201).json({ 
        message: "User registered successfully",
        userId: user.id
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
  app.post("/api/auth/register/business", async (req: Request, res: Response) => {
    try {
      // Handle file uploads and form data
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
      
      // Check for file uploads (would normally process files here)
      const governmentIdFile = req.body.governmentId || req.files?.governmentId;
      const proofOfAddressFile = req.body.proofOfAddress || req.files?.proofOfAddress;
      const proofOfBusinessFile = req.body.proofOfBusiness || req.files?.proofOfBusiness;
      
      if (!governmentIdFile || !proofOfAddressFile || !proofOfBusinessFile) {
        return res.status(400).json({ message: "Missing required document uploads" });
      }
      
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
          governmentId: "path/to/governmentId.pdf", // In a real app, store actual file paths
          proofOfAddress: "path/to/proofOfAddress.pdf",
          proofOfBusiness: "path/to/proofOfBusiness.pdf",
          verificationStatus: "pending"
        }
      );
      
      // Return success
      return res.status(201).json({ 
        message: "Business registered successfully",
        userId: user.id
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Business registration error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
