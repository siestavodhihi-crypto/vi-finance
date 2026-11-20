import { Category, CategoryId } from "@/types";

export const CATEGORIES: Record<CategoryId, Category> = {
  food: {
    id: "food",
    name: "Ăn uống",
    icon: "UtensilsCrossed",
    type: "expense",
    color: "#E05C4B",
  },
  transport: {
    id: "transport",
    name: "Di chuyển",
    icon: "Car",
    type: "expense",
    color: "#C8A44A",
  },
  shopping: {
    id: "shopping",
    name: "Mua sắm",
    icon: "ShoppingBag",
    type: "expense",
    color: "#7C6FCD",
  },
  entertainment: {
    id: "entertainment",
    name: "Giải trí",
    icon: "Gamepad2",
    type: "expense",
    color: "#4A90D9",
  },
  health: {
    id: "health",
    name: "Sức khỏe",
    icon: "Heart",
    type: "expense",
    color: "#E5748E",
  },
  education: {
    id: "education",
    name: "Học tập",
    icon: "BookOpen",
    type: "expense",
    color: "#5DAA84",
  },
  salary: {
    id: "salary",
    name: "Lương",
    icon: "Landmark",
    type: "income",
    color: "#2D7D5F",
  },
  family: {
    id: "family",
    name: "Gia đình gửi",
    icon: "Home",
    type: "income",
    color: "#4DAA84",
  },
  freelance: {
    id: "freelance",
    name: "Làm thêm",
    icon: "Briefcase",
    type: "income",
    color: "#6BB89E",
  },
  savings: {
    id: "savings",
    name: "Tiết kiệm / Chuyển khoản",
    icon: "PiggyBank",
    type: "both",
    color: "#C8A44A",
  },
  rent: {
    id: "rent",
    name: "Tiền trọ",
    icon: "Building2",
    type: "expense",
    color: "#8B6F4A",
  },
  utilities: {
    id: "utilities",
    name: "Điện nước",
    icon: "Zap",
    type: "expense",
    color: "#6B6860",
  },
  internet: {
    id: "internet",
    name: "Mạng Internet",
    icon: "Wifi",
    type: "expense",
    color: "#3B82F6",
  },
  other: {
    id: "other",
    name: "Khác",
    icon: "MoreHorizontal",
    type: "both",
    color: "#8A8780",
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

export const INCOME_CATEGORIES = CATEGORY_LIST.filter(
  (c) => c.type === "income" || c.type === "both"
);

export const EXPENSE_CATEGORIES = CATEGORY_LIST.filter(
  (c) => c.type === "expense" || c.type === "both"
);

export const DEFAULT_DAILY_LIMIT = 150_000;
