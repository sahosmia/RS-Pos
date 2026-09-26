### 1. Sidebar Navigation Behavior & Accordion UX
- **Single Accordion Behavior:** Ensure only one sub-menu stays open at a time. Opening a new parent menu should smoothly collapse any previously opened menu (use Framer Motion or Headless UI Disclosure for fluid CSS animations).
- **Active State Highlighting:** If a child menu item is active (matches current route via `usePage().url`), its background (`bg-primary` or `bg-slate-800`) must span the full container width with distinct visual padding and text contrast.

### 2. Sidebar Scrollbar Clean-up
- Hide the default browser scrollbar from the sidebar element while retaining smooth scrolling capabilities.
- Apply utility classes like `scrollbar-none` (via `tailwind-scrollbar-hide` plugin or native CSS directives `-ms-overflow-style: none; scrollbar-width: none; &::-webkit-scrollbar { display: none; }`).

### 3. Header & Footer Layout Re-structuring
- **Header:** Relocate the user account/profile dropdown to the sticky Top Header section (including avatar, profile settings link, and status).
- **Sidebar Footer:** Place a dedicated, easily accessible **Logout Button** pinned to the bottom of the sidebar with an explicit confirmation workflow or direct Inertia POST logout request (`router.post(route('logout'))`).

### 4. Comprehensive Dashboard Analytics & Date Filtering
- **Dynamic Date Filter Bar:** Add a date range selector at the top of the main Dashboard supporting these preset periods:
  - *Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, This Month Last Year, This Year, Last Year, Current Financial Year, Last Financial Year, Custom Range*.
- **Metrics Summary Grid (Key Performance Cards):** Implement a responsive card grid showing aggregated metrics filtered by the selected date range:
  - **Sales:** Total Sales, Net Sales, Invoice Due, Total Sell Return.
  - **Purchases & Expenses:** Total Purchase, Purchase Due, Total Purchase Return, Expense.
- Ensure backend aggregation logic uses efficient database queries (Laravel Scopes/Queries) to keep performance fast.

### 5. Role & Permission Modal Refactoring
- **Modal Sizing & UX:** Expand the Permission Management Modal size (use `max-w-4xl` or `max-w-5xl` / full-screen responsive modal).
- **Structured Layout:** Group permissions logically into clean modules/categories (e.g., User Management, Sales, Inventory) using modern Checkbox Grid layouts with "Select All" capabilities for efficient assignment.


- 6. table er filer er pase reset button e reset logo thakbe 
- 7. Expoert er jonno pdf, csv, excel thakbe, ar select korlei ata show kore, but ami cai sob export korte tokon to problem, so ata amon vabe korte hobe je selecct kora thakle oi gulo export hobe na hole sob export hobe, ata amra first product table e kore dekte pari but at sob table e hobe jegulo exportable, ar 300 product list rako seeder e ata refrijaretor, ac, oven, wahsing messing mane home applince product sob seeder kor


### 8. Dynamic Async Searchable Select Components (Product, Category, Brand, Supplier, etc.)
- **Search-on-Type Behavior:** For database-driven select inputs across the app (e.g., Category, Brand in Add Product; Product, Supplier in Purchase), convert them into searchable Async Select / Combobox components.
- **Minimum Character Trigger:** Trigger the API search query only after the user types at least **3 characters** (`minLength: 3`).
- **Debounce Optimization:** Implement a **300ms–500ms debounce** on input change to prevent firing network requests on every keystroke.
- **Loading & Empty States:** Show clear loading spinners while fetching and display "No results found" or "Type at least 3 characters to search" messages accordingly.
- **Inertia / Axios Integration:** Ensure seamless integration with Laravel backend endpoints via Axios or Inertia `router.get` with partial reloads (`only: [...]`).

### 9. Quantity Input Scroll & Precision Fix (Add Sale)
- **Disable Mouse Scroll Increment/Decrement:** Prevent mouse wheel scrolling from changing the number values on Quantity inputs across the Add/Edit Sale items. (Use `onWheel={(e) => e.target.blur()}` or prevent default behavior on mouse wheel events).
- **Integer Step & Precision Control:** Set default input `step="1"` (or integer step handling) so that Keyboard Up/Down arrow keys strictly increment and decrement by integer values (`1, 2, 3...`) rather than producing floating-point decimals like `1.01, 1.02`. 
- **Optional Decimal Support:** Allow manual typing of decimal/float values for rare edge cases (e.g., fractional quantities like `1.5`), but default button/arrow interactions must increment by whole numbers (`1`).
- product instalation price e o same obosta
- all interger or number input filed e apply korbe

### 10. Reusable Label Component with Required Indicator
- **Global Label Component Enhancements:** Refactor or update the global `Label` component to accept a `required?: boolean` prop.
- **Red Asterisk Rendering:** When `required={true}` is passed to the `Label` component, automatically render a red asterisk `<span className="text-red-500 ml-0.5">*</span>` right next to the label text.
- **Consistent Form Styling:** Standardize this component across all forms (Add Sale, Add Product, Supplier, Customer, etc.) to ensure a clean and uniform UI indicator for required fields.

### 11. add purchess er product list er dropdown ta oi section er vitor duuke jacce




=======================================================================================


### contact er suppler er customer e akta confiuson toiri hocce to, akane jodi ami supplier theke filter e customer selcet kori tokon to problem karon sidebar e ata active menu dekai na, abar suppier theke jodi add conract kori tahole ata countrct type e customer dekai, ata to auto suppier hobar kota, 




Requirement Description:
Refactor and redesign the Contact Creation/Edit Modal to improve usability, responsiveness, and data structure. Ensure the modal layout is clean, modern, and seamless across both desktop and mobile devices.

1. Modal Size & Layout Adjustments
Desktop View: Increase the overall width and size of the modal to accommodate a multi-column structured grid.

Mobile View: Make the form fully responsive. On mobile devices (sm and below), display input fields in a single column per row (grid-cols-1) for comfortable scrolling and quick typing.

2. Contact Identity & Name Fields
Entity Type: Change to a Radio Button / Tab Group option (Individual vs. Business).

Prefix: Add a dropdown/select option for Prefix (Mr., Mrs., Ms., Dr., etc.).

Name Structure: Split the full name into three distinct input fields:

First Name (Required)

Middle Name (Optional)

Last Name (Required)

3. Identity & Phone Fields
Contact ID: Add an optional Contact ID input field.

If left empty by the user, the system should auto-generate a unique Contact ID on form submission.

Phone Numbers: Include fields for:

Primary Phone Number (Required)

Alternative Phone Number (Optional)

add refarece input filed but optional add in additional informations

4. Collapsible "Additional Information" Section
Create a collapsible accordion/toggle section titled "Additional Information" (collapsed by default to keep the primary view clean). When expanded, it should contain:

Opening Balance: Input field with currency indicator.

Billing Address: Full address input fields (Street, City, Zip/Postal Code, Country).

Shipping Address: Shipping address fields (with a "Same as Billing Address" checkbox option).

Any other secondary configuration settings or metadata.



