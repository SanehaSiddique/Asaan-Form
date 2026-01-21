import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const Card = ({
  children,
  variant = "default",
  hover = true,
  glow = false,
  className,
  ...props
}) => {
  const variants = {
    default: "bg-card border border-border shadow-soft",
    glass: "glass-card shadow-medium",
    gradient: "gradient-border shadow-medium",
    outline: "border-2 border-border bg-transparent",
  };

  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "rounded-2xl p-6",
        variants[variant],
        glow && "animate-pulse-glow",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;
