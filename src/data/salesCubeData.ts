import { Brand, Product, Customer, Employee, Promotion, DimDate, FactSales, SalesCubeDataset, HydratedSalesRecord } from '../types/dashboard';

// Simple deterministic random number generator to ensure consistent mock data
let seed = 42;
function random(): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function randomRange(min: number, max: number): number {
  return min + random() * (max - min);
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

// 1. Brands Dimension
export const BRANDS: Brand[] = [
  { BrandID: 1, BrandCode: 'BR-ACME', BrandName: 'Acme Corp', Manufacturer: 'Acme Industries', Country: 'USA', Website: 'https://acme.example.com', IsActive: true },
  { BrandID: 2, BrandCode: 'BR-NEXUS', BrandName: 'Nexus Tech', Manufacturer: 'Nexus Global', Country: 'Japan', Website: 'https://nexus.example.com', IsActive: true },
  { BrandID: 3, BrandCode: 'BR-ZENITH', BrandName: 'Zenith Retail', Manufacturer: 'Zenith Labs', Country: 'Germany', Website: 'https://zenith.example.com', IsActive: true },
  { BrandID: 4, BrandCode: 'BR-APEX', BrandName: 'Apex Goods', Manufacturer: 'Apex Corp', Country: 'Canada', Website: 'https://apex.example.com', IsActive: true },
  { BrandID: 5, BrandCode: 'BR-QUANT', BrandName: 'Quantex Solutions', Manufacturer: 'Quantex Mfg', Country: 'UK', Website: 'https://quantex.example.com', IsActive: true },
  { BrandID: 6, BrandCode: 'BR-HORIZ', BrandName: 'Horizon Devices', Manufacturer: 'Horizon LLC', Country: 'South Korea', Website: 'https://horizon.example.com', IsActive: true }
];

// Helper to get brand from product ID
const getBrandId = (productId: number): number => {
  return ((productId - 1) % BRANDS.length) + 1;
};

// 2. Products Dimension
export const PRODUCTS: Product[] = [
  // Electronics (CategoryID: 1)
  { ProductID: 1, ProductCode: 'PRD-EL-01', ProductName: 'Quantum Phone Pro', CategoryID: 1, CategoryName: 'Electronics', BrandID: 2, UnitID: 'PCS', StandardCost: 450, ListPrice: 899, DiscountPrice: 849, Color: 'Midnight Blue', IsActive: true, IsDiscontinued: false },
  { ProductID: 2, ProductCode: 'PRD-EL-02', ProductName: 'Aura Soundbar X', CategoryID: 1, CategoryName: 'Electronics', BrandID: 6, UnitID: 'PCS', StandardCost: 120, ListPrice: 299, DiscountPrice: 279, Color: 'Matte Black', IsActive: true, IsDiscontinued: false },
  { ProductID: 3, ProductCode: 'PRD-EL-03', ProductName: 'Zenith Smartwatch 4', CategoryID: 1, CategoryName: 'Electronics', BrandID: 3, UnitID: 'PCS', StandardCost: 95, ListPrice: 249, DiscountPrice: 229, Color: 'Space Gray', IsActive: true, IsDiscontinued: false },
  { ProductID: 4, ProductCode: 'PRD-EL-04', ProductName: 'Apex Noise Cancelling Headphones', CategoryID: 1, CategoryName: 'Electronics', BrandID: 4, UnitID: 'PCS', StandardCost: 80, ListPrice: 199, DiscountPrice: 179, Color: 'Silver', IsActive: true, IsDiscontinued: false },
  { ProductID: 5, ProductCode: 'PRD-EL-05', ProductName: 'Nexus Ultra Chromebook', CategoryID: 1, CategoryName: 'Electronics', BrandID: 2, UnitID: 'PCS', StandardCost: 220, ListPrice: 499, DiscountPrice: 469, Color: 'Carbon Fiber', IsActive: true, IsDiscontinued: false },
  
  // Office Supplies (CategoryID: 2)
  { ProductID: 6, ProductCode: 'PRD-OF-01', ProductName: 'Acme Ergonomic Task Chair', CategoryID: 2, CategoryName: 'Office Supplies', BrandID: 1, UnitID: 'PCS', StandardCost: 150, ListPrice: 349, DiscountPrice: 319, Color: 'Black', IsActive: true, IsDiscontinued: false },
  { ProductID: 7, ProductCode: 'PRD-OF-02', ProductName: 'Apex Bamboo Standing Desk', CategoryID: 2, CategoryName: 'Office Supplies', BrandID: 4, UnitID: 'PCS', StandardCost: 280, ListPrice: 599, DiscountPrice: 549, Color: 'Natural Oak', IsActive: true, IsDiscontinued: false },
  { ProductID: 8, ProductCode: 'PRD-OF-03', ProductName: 'Quantex LED Monitor Arm', CategoryID: 2, CategoryName: 'Office Supplies', BrandID: 5, UnitID: 'PCS', StandardCost: 45, ListPrice: 129, DiscountPrice: 119, Color: 'Dark Gray', IsActive: true, IsDiscontinued: false },
  { ProductID: 9, ProductCode: 'PRD-OF-04', ProductName: 'Horizon Premium Desk Organizer', CategoryID: 2, CategoryName: 'Office Supplies', BrandID: 6, UnitID: 'PCS', StandardCost: 15, ListPrice: 49, DiscountPrice: 45, Color: 'White Gold', IsActive: true, IsDiscontinued: false },

  // Apparel & Gears (CategoryID: 3)
  { ProductID: 10, ProductCode: 'PRD-AP-01', ProductName: 'Zenith Storm Jacket', CategoryID: 3, CategoryName: 'Apparel & Gears', BrandID: 3, UnitID: 'PCS', StandardCost: 65, ListPrice: 159, DiscountPrice: 149, Color: 'Forest Green', IsActive: true, IsDiscontinued: false },
  { ProductID: 11, ProductCode: 'PRD-AP-02', ProductName: 'Apex Hiking Backpack 40L', CategoryID: 3, CategoryName: 'Apparel & Gears', BrandID: 4, UnitID: 'PCS', StandardCost: 40, ListPrice: 99, DiscountPrice: 89, Color: 'Crimson', IsActive: true, IsDiscontinued: false },
  { ProductID: 12, ProductCode: 'PRD-AP-03', ProductName: 'Acme Utility Work Gloves', CategoryID: 3, CategoryName: 'Apparel & Gears', BrandID: 1, UnitID: 'PAIR', StandardCost: 10, ListPrice: 29, DiscountPrice: 25, Color: 'Yellow/Black', IsActive: true, IsDiscontinued: false },
  { ProductID: 13, ProductCode: 'PRD-AP-04', ProductName: 'Quantex Smart Sneakers', CategoryID: 3, CategoryName: 'Apparel & Gears', BrandID: 5, UnitID: 'PAIR', StandardCost: 70, ListPrice: 179, DiscountPrice: 169, Color: 'Neon Lime', IsActive: true, IsDiscontinued: false },

  // Home & Kitchen (CategoryID: 4)
  { ProductID: 14, ProductCode: 'PRD-HK-01', ProductName: 'Nexus Smart Espresso Station', CategoryID: 4, CategoryName: 'Home & Kitchen', BrandID: 2, UnitID: 'PCS', StandardCost: 380, ListPrice: 799, DiscountPrice: 749, Color: 'Stainless Steel', IsActive: true, IsDiscontinued: false },
  { ProductID: 15, ProductCode: 'PRD-HK-02', ProductName: 'Horizon Induction Cooktop Duo', CategoryID: 4, CategoryName: 'Home & Kitchen', BrandID: 6, UnitID: 'PCS', StandardCost: 110, ListPrice: 249, DiscountPrice: 229, Color: 'Schott Glass', IsActive: true, IsDiscontinued: false },
  { ProductID: 16, ProductCode: 'PRD-HK-03', ProductName: 'Acme Vacuum Sealer Pro', CategoryID: 4, CategoryName: 'Home & Kitchen', BrandID: 1, UnitID: 'PCS', StandardCost: 35, ListPrice: 99, DiscountPrice: 89, Color: 'Gunmetal', IsActive: true, IsDiscontinued: false },
  { ProductID: 17, ProductCode: 'PRD-HK-04', ProductName: 'Zenith HEPA Air Purifier', CategoryID: 4, CategoryName: 'Home & Kitchen', BrandID: 3, UnitID: 'PCS', StandardCost: 90, ListPrice: 199, DiscountPrice: 189, Color: 'Arctic White', IsActive: true, IsDiscontinued: false },

  // Sports & Outdoors (CategoryID: 5)
  { ProductID: 18, ProductCode: 'PRD-SP-01', ProductName: 'Quantex Carbon Fiber Paddle', CategoryID: 5, CategoryName: 'Sports & Outdoors', BrandID: 5, UnitID: 'PCS', StandardCost: 85, ListPrice: 189, DiscountPrice: 179, Color: 'Red Kevlar', IsActive: true, IsDiscontinued: false },
  { ProductID: 19, ProductCode: 'PRD-SP-02', ProductName: 'Horizon Smart Fitness Mat', CategoryID: 5, CategoryName: 'Sports & Outdoors', BrandID: 6, UnitID: 'PCS', StandardCost: 30, ListPrice: 89, DiscountPrice: 79, Color: 'Teal Blue', IsActive: true, IsDiscontinued: false },
  { ProductID: 20, ProductCode: 'PRD-SP-03', ProductName: 'Apex Self-Inflating Mattress', CategoryID: 5, CategoryName: 'Sports & Outdoors', BrandID: 4, UnitID: 'PCS', StandardCost: 25, ListPrice: 69, DiscountPrice: 59, Color: 'Olive', IsActive: true, IsDiscontinued: false },
  { ProductID: 21, ProductCode: 'PRD-SP-04', ProductName: 'Zenith Foldable E-Bike 250W', CategoryID: 5, CategoryName: 'Sports & Outdoors', BrandID: 3, UnitID: 'PCS', StandardCost: 650, ListPrice: 1299, DiscountPrice: 1199, Color: 'Midnight Gray', IsActive: true, IsDiscontinued: true }
];

// 3. Employees (Sales Reps) Dimension
export const EMPLOYEES: Employee[] = [
  { EmployeeID: 101, EmployeeCode: 'EMP-01', FirstName: 'Alice', LastName: 'Smith', DepartmentID: 10, JobTitleID: 1, JobTitle: 'Senior Sales Representative', HireDate: '2019-03-12', EmploymentType: 'Full-Time', EmploymentStatus: 'Active', IsActive: true },
  { EmployeeID: 102, EmployeeCode: 'EMP-02', FirstName: 'Marcus', LastName: 'Vance', DepartmentID: 10, JobTitleID: 1, JobTitle: 'Enterprise Accounts Executive', HireDate: '2020-07-22', EmploymentType: 'Full-Time', EmploymentStatus: 'Active', IsActive: true },
  { EmployeeID: 103, EmployeeCode: 'EMP-03', FirstName: 'Clara', LastName: 'Oswald', DepartmentID: 10, JobTitleID: 2, JobTitle: 'Sales Associate', HireDate: '2022-01-10', EmploymentType: 'Full-Time', EmploymentStatus: 'Active', IsActive: true },
  { EmployeeID: 104, EmployeeCode: 'EMP-04', FirstName: 'David', LastName: 'Miller', DepartmentID: 10, JobTitleID: 1, JobTitle: 'Sales Representative', HireDate: '2021-08-15', EmploymentType: 'Full-Time', EmploymentStatus: 'Active', IsActive: true },
  { EmployeeID: 105, EmployeeCode: 'EMP-05', FirstName: 'Elena', LastName: 'Rostova', DepartmentID: 10, JobTitleID: 1, JobTitle: 'Inside Sales Specialist', HireDate: '2023-05-01', EmploymentType: 'Full-Time', EmploymentStatus: 'Active', IsActive: true },
  { EmployeeID: 106, EmployeeCode: 'EMP-06', FirstName: 'Kenji', LastName: 'Sato', DepartmentID: 10, JobTitleID: 3, JobTitle: 'Regional Sales Manager', HireDate: '2018-11-30', EmploymentType: 'Full-Time', EmploymentStatus: 'Active', IsActive: true },
  { EmployeeID: 107, EmployeeCode: 'EMP-07', FirstName: 'Fiona', LastName: 'Gallagher', DepartmentID: 10, JobTitleID: 2, JobTitle: 'Junior Sales Representative', HireDate: '2024-02-14', EmploymentType: 'Full-Time', EmploymentStatus: 'Active', IsActive: true },
  { EmployeeID: 108, EmployeeCode: 'EMP-08', FirstName: 'George', LastName: 'Costanza', DepartmentID: 10, JobTitleID: 2, JobTitle: 'Sales Associate', HireDate: '2023-09-01', EmploymentType: 'Contract', EmploymentStatus: 'Active', IsActive: true }
];

// 4. Customers Dimension
export const CUSTOMERS: Customer[] = [
  // USA Customers
  { CustomerID: 201, CustomerCode: 'CUST-US-01', CustomerType: 'Corporate', CompanyName: 'MegaCorp Inc.', FirstName: 'Arthur', LastName: 'Pendragon', City: 'New York', Country: 'USA', CategoryID: 1, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2021-02-05' },
  { CustomerID: 202, CustomerCode: 'CUST-US-02', CustomerType: 'Wholesale', CompanyName: 'Western Distributors', FirstName: 'Wyatt', LastName: 'Earp', City: 'Denver', Country: 'USA', CategoryID: 2, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2020-10-12' },
  { CustomerID: 203, CustomerCode: 'CUST-US-03', CustomerType: 'Retail', CompanyName: 'Individual Retail Customer 1', FirstName: 'John', LastName: 'Doe', City: 'Miami', Country: 'USA', CategoryID: 3, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2023-01-15' },
  { CustomerID: 204, CustomerCode: 'CUST-US-04', CustomerType: 'Corporate', CompanyName: 'Apex Data Labs', FirstName: 'Grace', LastName: 'Hopper', City: 'Seattle', Country: 'USA', CategoryID: 1, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2022-04-18' },
  { CustomerID: 205, CustomerCode: 'CUST-US-05', CustomerType: 'Retail', CompanyName: 'Individual Retail Customer 2', FirstName: 'Sarah', LastName: 'Connor', City: 'Los Angeles', Country: 'USA', CategoryID: 3, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2023-06-20' },
  
  // Canada Customers
  { CustomerID: 206, CustomerCode: 'CUST-CA-01', CustomerType: 'Corporate', CompanyName: 'Maple Leaf Logistical', FirstName: 'Justin', LastName: 'Trudeau', City: 'Toronto', Country: 'Canada', CategoryID: 1, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2021-08-25' },
  { CustomerID: 207, CustomerCode: 'CUST-CA-02', CustomerType: 'Wholesale', CompanyName: 'Pacific Supply Co', FirstName: 'Geddy', LastName: 'Lee', City: 'Vancouver', Country: 'Canada', CategoryID: 2, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2020-05-14' },
  { CustomerID: 208, CustomerCode: 'CUST-CA-03', CustomerType: 'Retail', CompanyName: 'Individual Retail Customer 3', FirstName: 'Avril', LastName: 'Lavigne', City: 'Montreal', Country: 'Canada', CategoryID: 3, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2024-01-10' },

  // UK Customers
  { CustomerID: 209, CustomerCode: 'CUST-UK-01', CustomerType: 'Corporate', CompanyName: 'Britannic Tech Holdings', FirstName: 'Winston', LastName: 'Churchill', City: 'London', Country: 'UK', CategoryID: 1, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2021-12-01' },
  { CustomerID: 210, CustomerCode: 'CUST-UK-02', CustomerType: 'Wholesale', CompanyName: 'Thames Valley Wholesalers', FirstName: 'Mary', LastName: 'Poppins', City: 'Reading', Country: 'UK', CategoryID: 2, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2022-09-09' },
  { CustomerID: 211, CustomerCode: 'CUST-UK-03', CustomerType: 'Retail', CompanyName: 'Individual Retail Customer 4', FirstName: 'Sherlock', LastName: 'Holmes', City: 'London', Country: 'UK', CategoryID: 3, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2023-04-12' },

  // Germany Customers
  { CustomerID: 212, CustomerCode: 'CUST-DE-01', CustomerType: 'Corporate', CompanyName: 'Rheinland Automation AG', FirstName: 'Otto', LastName: 'Bismarck', City: 'Frankfurt', Country: 'Germany', CategoryID: 1, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2022-03-30' },
  { CustomerID: 213, CustomerCode: 'CUST-DE-02', CustomerType: 'Wholesale', CompanyName: 'Bayerische Handelshaus', FirstName: 'Angela', LastName: 'Merkel', City: 'Munich', Country: 'Germany', CategoryID: 2, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2020-11-20' },
  { CustomerID: 214, CustomerCode: 'CUST-DE-03', CustomerType: 'Retail', CompanyName: 'Individual Retail Customer 5', FirstName: 'Albert', LastName: 'Einstein', City: 'Berlin', Country: 'Germany', CategoryID: 3, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2023-11-15' },

  // France Customers
  { CustomerID: 215, CustomerCode: 'CUST-FR-01', CustomerType: 'Corporate', CompanyName: 'Lumiere Enterprises', FirstName: 'Marie', LastName: 'Curie', City: 'Paris', Country: 'France', CategoryID: 1, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2022-07-14' },
  { CustomerID: 216, CustomerCode: 'CUST-FR-02', CustomerType: 'Wholesale', CompanyName: 'Alliance Distribution France', FirstName: 'Napoleon', LastName: 'Bonaparte', City: 'Lyon', Country: 'France', CategoryID: 2, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2021-05-19' },

  // Japan Customers
  { CustomerID: 217, CustomerCode: 'CUST-JP-01', CustomerType: 'Corporate', CompanyName: 'Nippon Import Corp', FirstName: 'Akira', LastName: 'Kurosawa', City: 'Tokyo', Country: 'Japan', CategoryID: 1, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2021-01-20' },
  { CustomerID: 218, CustomerCode: 'CUST-JP-02', CustomerType: 'Wholesale', CompanyName: 'Kansai Trading Group', FirstName: 'Hokusai', LastName: 'Katsushika', City: 'Osaka', Country: 'Japan', CategoryID: 2, CustomerStatus: 'Active', IsActive: true, RegistrationDate: '2022-08-01' }
];

// 5. Promotions Dimension
export const PROMOTIONS: Promotion[] = [
  { PromotionID: 1, PromotionCode: 'PROMO-NONE', PromotionName: 'Standard Sales (No Promotion)', PromotionType: 'No Promotion', DiscountPercent: 0.0, DiscountAmount: 0.0, StartDate: '2024-01-01', EndDate: '2026-12-31', IsActive: true },
  { PromotionID: 2, PromotionCode: 'PROMO-BF25', PromotionName: 'Black Friday Super Sale', PromotionType: 'Volume', DiscountPercent: 0.20, DiscountAmount: 0.0, StartDate: '2024-11-20', EndDate: '2026-11-30', IsActive: true },
  { PromotionID: 3, PromotionCode: 'PROMO-HOLIDAY', PromotionName: 'Holiday Seasons Cheer', PromotionType: 'Holiday', DiscountPercent: 0.10, DiscountAmount: 0.0, StartDate: '2024-12-01', EndDate: '2026-12-25', IsActive: true },
  { PromotionID: 4, PromotionCode: 'PROMO-SUMMER', PromotionName: 'Summer Clearout', PromotionType: 'Seasonal', DiscountPercent: 0.15, DiscountAmount: 0.0, StartDate: '2024-06-15', EndDate: '2026-08-31', IsActive: true },
  { PromotionID: 5, PromotionCode: 'PROMO-B2B-BULK', PromotionName: 'Corporate VIP Volume Deal', PromotionType: 'Special', DiscountPercent: 0.07, DiscountAmount: 50.0, StartDate: '2024-01-01', EndDate: '2026-12-31', IsActive: true }
];

// Helper to check if a promotion is active on a date
const getEligiblePromotion = (dateStr: string, customerType: string, randomVal: number): Promotion => {
  const dateObj = new Date(dateStr);
  const month = dateObj.getMonth(); // 0-11
  const day = dateObj.getDate();

  // Corporate bulk customer might trigger B2B Promo
  if (customerType === 'Corporate' && randomVal < 0.3) {
    return PROMOTIONS[4]; // Corporate VIP
  }

  // Black Friday: Late Nov
  if (month === 10 && day >= 20 && day <= 30) {
    return randomVal < 0.8 ? PROMOTIONS[1] : PROMOTIONS[0]; // 80% Black Friday
  }

  // Holiday season: Dec 1 - Dec 25
  if (month === 11 && day <= 25) {
    return randomVal < 0.6 ? PROMOTIONS[2] : PROMOTIONS[0]; // 60% Holiday
  }

  // Summer seasonal: June 15 - Aug 31
  if ((month === 5 && day >= 15) || month === 6 || month === 7) {
    return randomVal < 0.4 ? PROMOTIONS[3] : PROMOTIONS[0]; // 40% Summer
  }

  return PROMOTIONS[0]; // No Promotion
};

// 6. DimDate Generator
export const generateDateKey = (dateStr: string): number => {
  const date = new Date(dateStr);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return parseInt(`${yyyy}${mm}${dd}`, 10);
};

export const createDimDate = (dateStr: string): DimDate => {
  const date = new Date(dateStr);
  const monthName = date.toLocaleString('default', { month: 'long' });
  const monthNum = date.getMonth() + 1;
  const quarter = Math.ceil(monthNum / 3);
  return {
    DateKey: generateDateKey(dateStr),
    FullDate: dateStr,
    DayNumber: date.getDate(),
    MonthNumber: monthNum,
    MonthName: monthName,
    QuarterNumber: quarter,
    YearNumber: date.getFullYear()
  };
};

// 7. FactSales Generator
export const generateSalesCube = (): SalesCubeDataset => {
  // Reset seed for consistency
  seed = 42;

  const sales: FactSales[] = [];
  const dateMap = new Map<number, DimDate>();

  const startYear = 2024;
  const endYear = 2026;
  let orderDetailIdCounter = 100000;
  let salesOrderIdCounter = 50000;

  // Let's generate records.
  // We want to generate ~1,500 transactions.
  // To create a realistic time series, we'll distribute orders across days, with seasonal multipliers.
  const totalTargetOrders = 1300;

  for (let i = 0; i < totalTargetOrders; i++) {
    // Determine random date
    // Biased towards 2025/2026 (growth trend) and Q4 (seasonal spike)
    const yearChoice = random() < 0.25 ? 2024 : random() < 0.6 ? 2025 : 2026;
    
    // Month choice: higher weights in Nov (10) and Dec (11)
    const monthRand = random();
    let monthNum = 0;
    if (monthRand < 0.15) {
      monthNum = 11; // Dec
    } else if (monthRand < 0.27) {
      monthNum = 10; // Nov
    } else {
      monthNum = Math.floor(random() * 10); // Jan-Oct (0-9)
    }

    const dayNum = Math.floor(randomRange(1, 28)); // avoid month end date issues
    
    const formattedMonth = String(monthNum + 1).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    const orderDateStr = `${yearChoice}-${formattedMonth}-${formattedDay}`;
    const dateKey = generateDateKey(orderDateStr);

    // Build DimDate if not present
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, createDimDate(orderDateStr));
    }

    // Customer
    const customer = randomChoice(CUSTOMERS);
    
    // Brand & Product
    const product = randomChoice(PRODUCTS);
    const brand = BRANDS.find(b => b.BrandID === product.BrandID)!;

    // Sales Rep (Employee)
    // Reps have performance profiles:
    // Rep 101, 102, 104, 106 are high performers. Rep 108 is a contractor (lower volume).
    // Let's do a weighted choice:
    const repWeights = [
      { id: 101, weight: 0.18 }, // Alice: Solid high volume
      { id: 102, weight: 0.22 }, // Marcus: Enterprise accounts (wholesale focus)
      { id: 103, weight: 0.10 }, // Clara: Lower associate
      { id: 104, weight: 0.14 }, // David: Standard
      { id: 105, weight: 0.12 }, // Elena: Standard
      { id: 106, weight: 0.15 }, // Kenji: Manager, high deals
      { id: 107, weight: 0.06 }, // Fiona: Junior
      { id: 108, weight: 0.03 }  // George: Low contract worker
    ];
    let repRand = random();
    let selectedRepId = 101;
    let sumWeight = 0;
    for (const rw of repWeights) {
      sumWeight += rw.weight;
      if (repRand <= sumWeight) {
        selectedRepId = rw.id;
        break;
      }
    }

    // Order type based on customer type
    let orderType: 'Online' | 'In-Store' | 'Wholesale-Contract' = 'Online';
    if (customer.CustomerType === 'Wholesale' || customer.CustomerType === 'Corporate') {
      orderType = random() < 0.85 ? 'Wholesale-Contract' : 'Online';
    } else {
      orderType = random() < 0.5 ? 'In-Store' : 'Online';
    }

    // Quantity based on customer type (wholesale buys bulk, retail buys singles)
    let quantity = 1;
    if (customer.CustomerType === 'Corporate') {
      quantity = Math.floor(randomRange(5, 25));
    } else if (customer.CustomerType === 'Wholesale') {
      quantity = Math.floor(randomRange(10, 80));
    } else {
      quantity = Math.floor(randomRange(1, 4));
    }

    // Determine promotion
    const promotion = getEligiblePromotion(orderDateStr, customer.CustomerType, random());

    // Price dynamics
    // Base unit price is product's list price, but allow minor variations based on order type (corporate discounts, negotiation)
    let unitPrice = product.ListPrice;
    if (orderType === 'Wholesale-Contract') {
      unitPrice = product.DiscountPrice * randomRange(0.95, 1.02); // 95%-102% of discount price
    } else {
      unitPrice = product.ListPrice * randomRange(0.98, 1.02); // 98%-102% of list price
    }
    unitPrice = Math.round(unitPrice * 100) / 100;

    // Apply promotion discount
    let discountPercent = promotion.DiscountPercent;
    let discountAmount = (quantity * unitPrice) * discountPercent;
    
    // Add additional flat discount amount from promo if applicable
    if (promotion.DiscountAmount > 0) {
      discountAmount += promotion.DiscountAmount * (quantity > 10 ? 2 : 1);
    }
    
    // Cap discount amount to order value
    if (discountAmount > (quantity * unitPrice)) {
      discountAmount = quantity * unitPrice;
    }
    
    // Re-calculate effective discount percent
    discountPercent = discountAmount / (quantity * unitPrice);
    discountPercent = Math.round(discountPercent * 10000) / 10000;
    discountAmount = Math.round(discountAmount * 100) / 100;

    // Tax calculation
    let taxPercent = 0.08; // default 8% for US
    if (customer.Country === 'Germany' || customer.Country === 'France') {
      taxPercent = 0.19; // VAT
    } else if (customer.Country === 'UK') {
      taxPercent = 0.20; // UK VAT
    } else if (customer.Country === 'Canada') {
      taxPercent = 0.12; // GST/PST average
    } else if (customer.Country === 'Japan') {
      taxPercent = 0.10; // Consumption tax
    }

    const taxableBase = (quantity * unitPrice) - discountAmount;
    const taxAmount = Math.round((taxableBase * taxPercent) * 100) / 100;

    // Line total (Gross total after discounts, including taxes)
    const lineTotal = Math.round((taxableBase + taxAmount) * 100) / 100;

    // Statuses
    const orderStatusRand = random();
    let orderStatus: 'Completed' | 'Shipped' | 'Processing' | 'Cancelled' = 'Completed';
    if (orderStatusRand < 0.02) {
      orderStatus = 'Cancelled';
    } else if (orderStatusRand < 0.05) {
      orderStatus = 'Processing';
    } else if (orderStatusRand < 0.15) {
      orderStatus = 'Shipped';
    }

    let paymentStatus: 'Paid' | 'Pending' | 'Refunded' = 'Paid';
    if (orderStatus === 'Cancelled') {
      paymentStatus = 'Refunded';
    } else if (orderStatus === 'Processing' || (orderStatus === 'Shipped' && random() < 0.3)) {
      paymentStatus = 'Pending';
    }

    let deliveryStatus: 'Delivered' | 'In Transit' | 'Pending' | 'Returned' = 'Delivered';
    if (orderStatus === 'Cancelled') {
      deliveryStatus = 'Returned';
    } else if (orderStatus === 'Processing') {
      deliveryStatus = 'Pending';
    } else if (orderStatus === 'Shipped') {
      deliveryStatus = 'In Transit';
    }

    // Due date (usually order date + 15 days for wholesale, +2 days for retail)
    const orderDateObj = new Date(orderDateStr);
    const dueDays = orderType === 'Wholesale-Contract' ? 15 : 3;
    orderDateObj.setDate(orderDateObj.getDate() + dueDays);
    const dueDateStr = orderDateObj.toISOString().split('T')[0];

    const salesOrderId = salesOrderIdCounter + Math.floor(i / 1.3); // multiple order items can share order ID
    orderDetailIdCounter++;

    sales.push({
      OrderDetailID: orderDetailIdCounter,
      SalesOrderID: salesOrderId,
      OrderNumber: `SO-${salesOrderId}`,
      CustomerID: customer.CustomerID,
      OrderDate: orderDateStr,
      SalesRepID: selectedRepId,
      OrderType: orderType,
      OrderStatus: orderStatus,
      PaymentStatus: paymentStatus,
      ProductID: product.ProductID,
      Quantity: quantity,
      UnitPrice: unitPrice,
      DiscountPercent: discountPercent,
      DiscountAmount: discountAmount,
      TaxPercent: taxPercent,
      TaxAmount: taxAmount,
      LineTotal: lineTotal,
      PromotionID: promotion.PromotionID,
      DeliveryStatus: deliveryStatus,
      Currency: 'USD',
      DueDate: dueDateStr,
      DateKey: dateKey,
      BrandID: brand.BrandID
    });
  }

  // Sort sales by date for clean time series indexing
  sales.sort((a, b) => a.DateKey - b.DateKey);

  // Return the full schema
  return {
    brands: BRANDS,
    products: PRODUCTS,
    customers: CUSTOMERS,
    employees: EMPLOYEES,
    promotions: PROMOTIONS,
    dates: Array.from(dateMap.values()).sort((a, b) => a.DateKey - b.DateKey),
    sales: sales
  };
};

// Generate active singleton instance
export const dataset = generateSalesCube();

// Fast caching arrays for performance
const brandMap = new Map(dataset.brands.map(b => [b.BrandID, b]));
const productMap = new Map(dataset.products.map(p => [p.ProductID, p]));
const customerMap = new Map(dataset.customers.map(c => [c.CustomerID, c]));
const employeeMap = new Map(dataset.employees.map(e => [e.EmployeeID, e]));
const promotionMap = new Map(dataset.promotions.map(p => [p.PromotionID, p]));
const dateMap = new Map(dataset.dates.map(d => [d.DateKey, d]));

// Helper to hydrate the raw FactSales records with their joined dimensions (SSAS semantic layer equivalence)
export const getHydratedSales = (): HydratedSalesRecord[] => {
  return dataset.sales.map(s => {
    const brand = brandMap.get(s.BrandID) || BRANDS[0];
    const product = productMap.get(s.ProductID) || PRODUCTS[0];
    const customer = customerMap.get(s.CustomerID) || CUSTOMERS[0];
    const employee = employeeMap.get(s.SalesRepID) || EMPLOYEES[0];
    const promotion = promotionMap.get(s.PromotionID) || PROMOTIONS[0];
    const dateInfo = dateMap.get(s.DateKey) || createDimDate(s.OrderDate);

    return {
      ...s,
      Brand: brand,
      Product: product,
      Customer: customer,
      Employee: employee,
      Promotion: promotion,
      DateInfo: dateInfo
    };
  });
};

export const hydratedDataset = getHydratedSales();
