import {
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Gamepad2,
  Heart,
  BookOpen,
  Landmark,
  Home,
  Briefcase,
  PiggyBank,
  Building2,
  Zap,
  Wifi,
  MoreHorizontal,
  ArrowLeftRight,
  Wallet as WalletIcon,
  CreditCard,
  Smartphone,
} from "lucide-react";
import { CategoryId } from "@/types";
import { CATEGORIES } from "@/lib/constants";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Gamepad2,
  Heart,
  BookOpen,
  Landmark,
  Home,
  Briefcase,
  PiggyBank,
  Building2,
  Zap,
  Wifi,
  MoreHorizontal,
  ArrowLeftRight,
  Wallet: WalletIcon,
  CreditCard,
  Smartphone,
};

interface CategoryIconProps {
  categoryId?: CategoryId;
  iconName?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CategoryIcon({
  categoryId,
  iconName,
  size = 20,
  strokeWidth = 1.75,
  className,
}: CategoryIconProps) {
  const cat = categoryId ? CATEGORIES[categoryId] : null;
  const targetIcon = iconName || cat?.icon || "MoreHorizontal";
  const IconComp = ICON_MAP[targetIcon] ?? MoreHorizontal;
  return <IconComp size={size} strokeWidth={strokeWidth} className={className} />;
}
