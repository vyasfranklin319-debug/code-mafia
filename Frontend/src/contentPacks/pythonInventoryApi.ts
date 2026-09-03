import { ContentPack } from '../types/game';

export const pythonInventoryApiPack: ContentPack = {
  id: 'py-inventory-api-v1',
  name: 'Inventory & Discount Manager (Python)',
  description: 'Python e-commerce stock manager with seeded bugs in float tax calculations, negative inventory checks, and discount threshold tiers.',
  language: 'python',
  difficulty: 'Medium',
  minPlayers: 5,
  maxPlayers: 12,
  estDurationMinutes: 18,
  files: [
    {
      path: 'inventory.py',
      name: 'inventory.py',
      language: 'python',
      initialContent: `class InventoryManager:
    def __init__(self):
        self.stock = {}
        self.tax_rate = 0.05

    def add_item(self, item_name: str, quantity: int, unit_price: float):
        if item_name not in self.stock:
            self.stock[item_name] = {"quantity": 0, "price": unit_price}
        self.stock[item_name]["quantity"] += quantity
        self.stock[item_name]["price"] = unit_price

    def calculate_total_with_tax(self, item_name: str, quantity: int) -> float:
        # BUG 1 (Seeded): Float precision bug - truncates instead of rounding to 2 decimals
        if item_name not in self.stock:
            return 0.0
        subtotal = self.stock[item_name]["price"] * quantity
        raw_total = subtotal * (1 + self.tax_rate)
        # Bug: int conversion truncates decimals completely ($20.989 becomes $20.0)!
        return float(int(raw_total))

    def deduct_stock(self, item_name: str, quantity: int) -> bool:
        # BUG 2 (Seeded): Allows stock to drop below 0 (negative inventory allocation)
        if item_name not in self.stock:
            return False
        # Missing check: if self.stock[item_name]["quantity"] < quantity
        self.stock[item_name]["quantity"] -= quantity
        return True

    def calculate_discount(self, order_total: float) -> float:
        # BUG 3 (Seeded): 10% discount threshold applies at > 100 instead of >= 100
        if order_total > 100.0:
            return order_total * 0.10
        elif order_total >= 50.0:
            return order_total * 0.05
        return 0.0
`,
      currentContent: `class InventoryManager:
    def __init__(self):
        self.stock = {}
        self.tax_rate = 0.05

    def add_item(self, item_name: str, quantity: int, unit_price: float):
        if item_name not in self.stock:
            self.stock[item_name] = {"quantity": 0, "price": unit_price}
        self.stock[item_name]["quantity"] += quantity
        self.stock[item_name]["price"] = unit_price

    def calculate_total_with_tax(self, item_name: str, quantity: int) -> float:
        # BUG 1 (Seeded): Float precision bug - truncates instead of rounding to 2 decimals
        if item_name not in self.stock:
            return 0.0
        subtotal = self.stock[item_name]["price"] * quantity
        raw_total = subtotal * (1 + self.tax_rate)
        # Bug: int conversion truncates decimals completely ($20.989 becomes $20.0)!
        return float(int(raw_total))

    def deduct_stock(self, item_name: str, quantity: int) -> bool:
        # BUG 2 (Seeded): Allows stock to drop below 0 (negative inventory allocation)
        if item_name not in self.stock:
            return False
        # Missing check: if self.stock[item_name]["quantity"] < quantity
        self.stock[item_name]["quantity"] -= quantity
        return True

    def calculate_discount(self, order_total: float) -> float:
        # BUG 3 (Seeded): 10% discount threshold applies at > 100 instead of >= 100
        if order_total > 100.0:
            return order_total * 0.10
        elif order_total >= 50.0:
            return order_total * 0.05
        return 0.0
`
    }
  ],
  testSuite: [
    {
      id: 'test-py-1',
      name: 'Tax Calculation Precision (2 Decimals)',
      description: 'Verifies calculate_total_with_tax rounds accurately to 2 decimal places (e.g. 19.99 * 1.05 = 20.99)',
      isHidden: false
    },
    {
      id: 'test-py-2',
      name: 'Negative Inventory Protection',
      description: 'Verifies deduct_stock returns False when requested quantity exceeds available stock',
      isHidden: false
    },
    {
      id: 'test-py-3',
      name: 'Boundary Discount Tier ($100 Exact)',
      description: 'Verifies calculate_discount gives 10% discount when order total is exactly $100.00',
      isHidden: false
    },
    {
      id: 'test-py-4',
      name: 'Stock Update Integrity',
      description: 'Verifies stock quantities remain accurate across multiple additions and valid deductions',
      isHidden: true
    }
  ],
  referenceSolution: {
    'inventory.py': `class InventoryManager:
    def __init__(self):
        self.stock = {}
        self.tax_rate = 0.05

    def add_item(self, item_name: str, quantity: int, unit_price: float):
        if item_name not in self.stock:
            self.stock[item_name] = {"quantity": 0, "price": unit_price}
        self.stock[item_name]["quantity"] += quantity
        self.stock[item_name]["price"] = unit_price

    def calculate_total_with_tax(self, item_name: str, quantity: int) -> float:
        if item_name not in self.stock:
            return 0.0
        subtotal = self.stock[item_name]["price"] * quantity
        raw_total = subtotal * (1 + self.tax_rate)
        return round(raw_total, 2)

    def deduct_stock(self, item_name: str, quantity: int) -> bool:
        if item_name not in self.stock or self.stock[item_name]["quantity"] < quantity:
            return False
        self.stock[item_name]["quantity"] -= quantity
        return True

    def calculate_discount(self, order_total: float) -> float:
        if order_total >= 100.0:
            return round(order_total * 0.10, 2)
        elif order_total >= 50.0:
            return round(order_total * 0.05, 2)
        return 0.0`
  }
};
