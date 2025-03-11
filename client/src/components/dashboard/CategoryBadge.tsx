const CategoryBadge = ({ isSelected, isCount, count, onClick, className, children }) => {
  return (
    <Button
      variant={isSelected ? "variant" : "outline"}
      size="sm"
      className={cn(
        "rounded-full h-8 text-xs px-3 gap-1.5 category-badge",
        isCount && "pr-2.5",
        isSelected ? "bg-primary text-primary-foreground" : "bg-background",
        className
      )}
      onClick={onClick}
    >
      {children}
      {isCount && count > 0 && (
        <span className="category-badge-count min-w-[1.1rem] text-center">{count}</span>
      )}
    </Button>
  );
};


const CategoryFilter = ({ categories }) => {
    return (
        <div className="overflow-x-auto">
            {categories.map(category => (
                <CategoryBadge key={category.id} isSelected={category.isSelected} isCount={category.count} count={category.count} onClick={() => {/* handle click */}}>
                    {category.name}
                </CategoryBadge>
            ))}
        </div>
    )
}