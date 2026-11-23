const KEY = {
    products: "mf_products",
    sales: "mf_sales",
    offers: "mf_offers",
    profile: "mf_profile_data",
    profileImage: "mf_profile_image"
};

const money = n => "৳" + Number(n || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2
});

const $ = id => document.getElementById(id);

// Default category images remain in HTML templates. Each product can override
// its category image by storing a direct image URL in product.image.
function imageTemplate(category) {
    return $("img-" + category) || $("img-Shirt");
}

function imageSource(category) {
    const template = imageTemplate(category);
    const image = template?.content?.querySelector("img");
    return image ? image.getAttribute("src") : "";
}

function safeImageUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
        const parsed = new URL(raw, window.location.href);
        return ["http:", "https:"].includes(parsed.protocol) ? raw : "";
    } catch {
        return "";
    }
}

function fillProductImages(root = document) {
    root.querySelectorAll("[data-product-image]").forEach(slot => {
        const product = products.find(p => p.id === slot.dataset.productId);
        const src = safeImageUrl(product?.image) || imageSource(slot.dataset.productImage);
        if (!src) return;

        const image = document.createElement("img");
        image.src = src;
        image.alt = product?.name || slot.dataset.productImage || "Product image";
        image.loading = "lazy";
        image.onerror = () => {
            image.onerror = null;
            const fallback = imageSource(slot.dataset.productImage);
            if (fallback && image.src !== fallback) image.src = fallback;
            else image.remove();
        };
        slot.replaceChildren(image);
    });
}

function updateProductImagePreview(value) {
    const preview = $("imagePreview");
    if (!preview) return;
    const url = safeImageUrl(value);
    preview.replaceChildren();

    if (!url) {
        preview.textContent = "Paste an image URL to preview the product image.";
        return;
    }

    const image = document.createElement("img");
    image.src = url;
    image.alt = "Product image preview";
    image.onerror = () => {
        preview.textContent = "Could not load this image. Please check the direct image URL.";
    };
    preview.appendChild(image);
}

// Read the default product records from index.html.
function readSeedProducts() {
    return [...document.querySelectorAll("#htmlProductCatalog [data-seed-product]")]
        .map(item => ({
            id: item.dataset.id,
            name: item.dataset.name,
            category: item.dataset.category,
            price: Number(item.dataset.price),
            stock: Number(item.dataset.stock),
            sold: Number(item.dataset.sold),
            image: imageSource(item.dataset.category)
        }));
}

const seedProducts = readSeedProducts();

let products = JSON.parse(
    localStorage.getItem(KEY.products) || "null"
);

if (!Array.isArray(products)) {
    products = seedProducts;
} else {
    let nextLegacy = 81;

    products = products.map(p => ({
        ...p,
        id: p.id || `MF${String(nextLegacy++).padStart(3, "0")}`,
        sold: Number(p.sold || 0),
        image: p.image || imageSource(p.category)
    }));

    const existing = new Set(products.map(p => p.id));

    products = [
        ...seedProducts.filter(p => !existing.has(p.id)),
        ...products
    ];
}

let sales = JSON.parse(localStorage.getItem(KEY.sales) || "[]");
let offers = JSON.parse(localStorage.getItem(KEY.offers) || "null");

const dateISO = d => {
    const x = new Date(d);

    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

const todayISO = dateISO(new Date());

const monthLater = new Date();
monthLater.setDate(monthLater.getDate() + 30);

const laterISO = dateISO(monthLater);

// Default promotional offers.
if (!Array.isArray(offers)) {
    offers = [
        {
            title: "Summer Sunglasses Deal",
            discount: 15,
            product: "Aviator Gold Sunglasses",
            start: todayISO,
            end: laterISO
        },
        {
            title: "Smart Shirt Week",
            discount: 20,
            product: "Premium White Shirt",
            start: todayISO,
            end: laterISO
        },
        {
            title: "Streetwear Special",
            discount: 10,
            product: "Classic Black T-Shirt",
            start: todayISO,
            end: laterISO
        },
        {
            title: "Bag Season Offer",
            discount: 25,
            product: "Leather Crossbody Bag",
            start: todayISO,
            end: laterISO
        },
        {
            title: "Sneaker Days",
            discount: 12,
            product: "Everyday Sneakers",
            start: todayISO,
            end: laterISO
        }
    ];
}

offers = offers.map(o => {
    const p = products.find(x => x.id === o.productId)
        || products.find(x => x.name === o.product);

    const raw = Number(
        String(o.discount ?? 0).replace(/[^0-9.]/g, "")
    );

    return {
        ...o,
        productId: o.productId || p?.id || "",
        product: p?.name || o.product || "Product",
        discount: Math.max(0, Math.min(100, raw)),
        start: o.start || todayISO,
        end: o.end || laterISO
    };
});

let selectedProduct = null;
let previewData = "";
let editingId = null;

let profileImage = localStorage.getItem(KEY.profileImage) || "";
let pendingProfileImage = profileImage;

// Save application data.
function save() {
    localStorage.setItem(KEY.products, JSON.stringify(products));
    localStorage.setItem(KEY.sales, JSON.stringify(sales));
    localStorage.setItem(KEY.offers, JSON.stringify(offers));
}

// Notifications.
function toast(msg) {
    const t = $("toast");

    if (!t) {
        alert(msg);
        return;
    }

    t.textContent = msg;
    t.classList.add("show");

    setTimeout(() => t.classList.remove("show"), 2300);
}

// Product card.
function productCard(p, actions = false) {
    return `
        <article class="product-card">
            <div class="product-image" data-product-image="${p.category}" data-product-id="${p.id}"></div>

            <div class="product-body">
                <span class="badge">${p.category}</span>

                <small class="product-id">ID: ${p.id}</small>

                <h4>${p.name}</h4>

                <p class="price">${money(p.price)}</p>

                <p class="stock-line">
                    Stock available: <b>${p.stock}</b>
                </p>

                ${actions ? `
                    <div class="card-actions">
                        <button class="mini-btn" onclick="editProduct('${p.id}')">
                            Edit
                        </button>

                        <button class="mini-btn" onclick="adjustProduct('${p.id}', 1)">
                            + Stock
                        </button>

                        <button class="mini-btn" onclick="adjustProduct('${p.id}', -1)">
                            − Stock
                        </button>

                        <button class="mini-btn delete" onclick="deleteProduct('${p.id}')">
                            Delete
                        </button>
                    </div>
                ` : ""}
            </div>
        </article>
    `;
}

// Dashboard statistics.
function updateStats() {
    $("totalProducts").textContent = products.length;

    $("availableStock").textContent = products.reduce(
        (a, p) => a + Number(p.stock || 0),
        0
    );

    $("recordSales").textContent = sales.length;

    $("lowStock").textContent = products.filter(
        p => p.stock <= 5
    ).length;
}

// Dashboard rendering.
function renderDashboard() {
    $("bestProducts").innerHTML = [...products]
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 40)
        .map(p => productCard(p))
        .join("");

    $("availableProducts").innerHTML = products
        .filter(p => p.stock > 0)
        .slice(0, 12)
        .map(p => productCard(p))
        .join("");

    $("dashboardOffers").innerHTML = offers
        .slice(0, 24)
        .map(offerCard)
        .join("");

    fillProductImages($("bestProducts"));
    fillProductImages($("availableProducts"));
    fillProductImages($("dashboardOffers"));
}

// Product page.
function renderProducts() {
    const q = ($("productSearch")?.value || "").toLowerCase();
    const c = $("categoryFilter")?.value || "";

    const list = products.filter(p =>
        (
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q)
        ) &&
        (!c || p.category === c)
    );

    $("productGrid").innerHTML = list
        .map(p => productCard(p, true))
        .join("") || "<div class='panel'>No products found.</div>";

    fillProductImages($("productGrid"));
}

// Sales page.
function renderSales() {
    const q = ($("saleSearch").value || "").toLowerCase();

    const list = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    ).slice(0, 10);

    $("saleResults").innerHTML = q
        ? list.map(p => `
            <div class="search-item" onclick="selectSale('${p.id}')">
                <div class="search-item-image" data-product-image="${p.category}" data-product-id="${p.id}"></div>

                <div>
                    <b>${p.name}</b><br>
                    <small>${p.id} · ${money(p.price)} · Stock ${p.stock}</small>
                </div>
            </div>
        `).join("")
        : "";

    fillProductImages($("saleResults"));

    $("selectedSale").innerHTML = selectedProduct
        ? `<b>${selectedProduct.name}</b><br>
           ${selectedProduct.id} · Product price ${money(selectedProduct.price)}
           · Available ${selectedProduct.stock}`
        : "";

    $("selectedSale").classList.toggle("hidden", !selectedProduct);

    // $("salesHistory").innerHTML = sales.slice().reverse()
    //     .map(s => `
    //         <div class="history-card">
    //             <div>
    //                 <b>${s.product}</b>
    //                 <small>
    //                     Sales ID: ${s.salesId} · Product ID: ${s.productId} · ${s.date}
    //                 </small>
    //             </div>

    //             <div>
    //                 <span>Qty ${s.qty}</span>
    //                 <span>Discount ${s.discount}% (${money(s.discountAmount)})</span>
    //                 <b>${money(s.total)}</b>
    //             </div>
    //         </div>
    //     `).join("") || "<p class='muted'>No sales recorded yet.</p>";
}

// Stock page.
function renderStock() {
    $("stockTable").innerHTML = `
        <h3>Inventory & Stock Status</h3>

        <div class="table-row stock-table-row">
            <b>Product ID / Name</b>
            <b>Category</b>
            <b>Price</b>
            <b>Stock</b>
            <b>Status</b>
        </div>
    ` + products.map(p => `
        <div class="table-row stock-table-row">
            <span><b>${p.id}</b><br>${p.name}</span>
            <span>${p.category}</span>
            <span>${money(p.price)}</span>
            <span>${p.stock}</span>
            <span class="${
                p.stock === 0 ? "out" : p.stock <= 5 ? "low" : ""
            }">
                ${
                    p.stock === 0
                        ? "Out of stock"
                        : p.stock <= 5
                            ? "Low stock"
                            : "Available"
                }
            </span>
        </div>
    `).join("");
}

// Reports page.
function renderReports() {
    const total = sales.reduce((a, s) => a + s.total, 0);
    const units = sales.reduce((a, s) => a + s.qty, 0);
    const value = products.reduce((a, p) => a + p.price * p.stock, 0);

    $("reportSales").textContent = money(total);
    $("reportUnits").textContent = units;
    $("reportValue").textContent = money(value);

    $("reportTable").innerHTML = sales.length
        ? `
            <div class="sale-row report-sale-row">
                <b>Sales ID / Product ID</b>
                <b>Product</b>
                <b>Qty / Discount</b>
                <b>Total / Date</b>
            </div>
        ` + sales.slice().reverse().map(s => `
            <div class="sale-row report-sale-row">
                <span>${s.salesId}<br>${s.productId}</span>
                <span>${s.product}</span>
                <span>${s.qty} / ${s.discount}%</span>
                <span>${money(s.total)}<br>${s.date}</span>
            </div>
        `).join("")
        : "<p class='muted'>No sales data yet.</p>";
}

// Offer card.
function offerCard(o) {
    const p = products.find(x => x.id === o.productId)
        || products.find(x => x.name === o.product);

    const pct = Number(o.discount) || 0;
    const original = Number(p?.price || 0);
    const sale = original * (1 - pct / 100);
    const today = dateISO(new Date());
    const status = o.start > today ? "Starts" : "";
    const dateLabel = `${o.start || "—"} to ${o.end || "—"}`;

    return `
        <article class="offer-card">
            <div class="offer-product-image" data-product-image="${p?.category || "Shirt"}" data-product-id="${p?.id || ""}"></div>

            <span class="badge">${p?.category || "Product"}</span>

            <h3>${o.title}</h3>

            <div class="discount">${pct}% OFF</div>

            <div class="offer-prices">
                <span class="old-price">${money(original)}</span>
                <span class="new-price">${money(sale)}</span>
            </div>

            <div class="offer-dates">
                ${status ? status + " · " : ""}${dateLabel}
            </div>

            <button class="mini-btn" onclick="deleteOffer(${offers.indexOf(o)})">
                Remove Offer
            </button>
        </article>
    `;
}

// Offers page.
function renderOffers() {
    $("offerGrid").innerHTML = offers
        .slice(0, 24)
        .map(offerCard)
        .join("") || "<div class='panel'>No offers yet.</div>";

    fillProductImages($("offerGrid"));
}

// Populate product categories.
function populateCategories() {
    const old = $("categoryFilter").value;
    const cats = [...new Set(products.map(p => p.category))];

    $("categoryFilter").innerHTML =
        '<option value="">All Categories</option>' +
        cats.map(c => `<option value="${c}">${c}</option>`).join("");

    $("categoryFilter").value = cats.includes(old) ? old : "";
}

// Populate offer product dropdown.
function populateOfferProducts() {
    const current = $("oProduct").value;

    $("oProduct").innerHTML = products.map(p => `
        <option value="${p.id}">
            ${p.id} — ${p.name} (${money(p.price)})
        </option>
    `).join("");

    if (products.some(p => p.id === current)) {
        $("oProduct").value = current;
    }

    updateOfferPreview();
}

// Preview offer price.
function updateOfferPreview() {
    const p = products.find(x => x.id === $("oProduct").value);

    const pct = Math.max(
        0,
        Math.min(100, Number($("oDiscount").value || 0))
    );

    $("offerPricePreview").innerHTML = p
        ? `
            <b>${p.name}</b><br>
            Regular price: ${money(p.price)}<br>
            Discount: ${pct}%<br>
            <b>Offer price: ${money(p.price * (1 - pct / 100))}</b>
        `
        : "Select a product to preview the offer price.";
}

// Apply profile image.
function applyProfileImage(src) {
    const sidebar = $("sidebarBrandPhoto");
    const owner = $("ownerPhoto");
    const avatar = $("profileAvatar");

    if (src) {
        sidebar.innerHTML = `<img src="${src}" alt="Monirul Fashion profile">`;
        owner.innerHTML = `<img src="${src}" alt="Business profile">`;
        avatar.innerHTML = `<img src="${src}" alt="Profile">`;
    } else {
        sidebar.innerHTML = '<span class="brand-fallback">✦</span>';
        owner.innerHTML = '<span class="owner-fallback">✦</span>';
        avatar.innerHTML = '<span class="avatar-fallback">●</span>';
    }
}

// Open profile modal.
function openProfile() {
    const d = JSON.parse(localStorage.getItem(KEY.profile) || "{}");

    $("profileBusiness").value = d.business || "Monirul Fashion";
    $("profileOwner").value = d.owner || "Monirul Islam";
    $("profileEmail").value = d.email || "062251042111004@student.kyau.edu.bd";
    $("profileAddress").value = d.address || "Bangladesh";
    $("profileAbout").value = d.about || "Fashion products, clothing, bags and accessories";

    pendingProfileImage = profileImage;

    applyProfileImage(pendingProfileImage);

    $("ownerImageInput").value = "";
    $("profileModal").classList.remove("hidden");
}

// Close profile without saving.
function closeProfileWithoutSaving() {
    pendingProfileImage = profileImage;
    applyProfileImage(profileImage);

    $("profileModal").classList.add("hidden");
    $("ownerImageInput").value = "";
}

// Render all application pages.
function render() {
    updateStats();
    renderProducts();
    renderDashboard();
    renderSales();
    renderStock();
    renderReports();
    renderOffers();
    populateCategories();
    populateOfferProducts();
}

// Navigate between pages.
function go(page) {
    document.querySelectorAll(".page").forEach(x => {
        x.classList.remove("active-page");
    });

    $(page).classList.add("active-page");

    document.querySelectorAll(".nav-btn").forEach(x => {
        x.classList.toggle("active", x.dataset.page === page);
    });

    $("pageTitle").textContent = page[0].toUpperCase() + page.slice(1);

    window.scrollTo(0, 0);
}

// Select a product for sale.
function selectSale(id) {
    selectedProduct = products.find(p => p.id === id) || null;

    $("saleSearch").value = selectedProduct ? selectedProduct.name : "";

    if (selectedProduct) {
        $("saleId").value = `SALE-${String(sales.length + 1).padStart(4, "0")}`;
        $("saleProductId").value = selectedProduct.id;
        $("saleProductPrice").value = selectedProduct.price;
        $("saleUnitPrice").value = selectedProduct.price;

        updateSaleTotals();
    }

    renderSales();
}

// Calculate sale totals.
function updateSaleTotals() {
    const price = Number($("saleUnitPrice").value || 0);
    const qty = Number($("saleQty").value || 0);

    const discount = Math.max(
        0,
        Math.min(100, Number($("saleDiscount").value || 0))
    );

    const before = price * qty;
    const amount = before * discount / 100;

    $("saleDiscountAmount").value = money(amount);
    $("saleFinalTotal").value = money(before - amount);
}

// Increase or decrease stock.
function adjustProduct(id, n) {
    const p = products.find(x => x.id === id);

    if (!p) return;

    p.stock = Math.max(0, Number(p.stock) + n);

    save();
    render();
}

// Delete product.
function deleteProduct(id) {
    if (confirm("Delete this product?")) {
        products = products.filter(p => p.id !== id);

        save();
        render();

        toast("Product deleted");
    }
}

// Edit product.
function editProduct(id) {
    const p = products.find(x => x.id === id);

    if (!p) return;

    editingId = id;

    $("productModal").classList.remove("hidden");
    $("productModalTitle").textContent = "Edit Product";

    $("pId").value = p.id;
    $("pName").value = p.name;
    $("pCategory").value = p.category;

    $("pCategorySelect").value = [...$("pCategorySelect").options]
        .some(o => o.value === p.category)
            ? p.category
            : "";

    $("pPrice").value = p.price;
    $("pStock").value = p.stock;
    $("pImageUrl").value = p.image || "";
    updateProductImagePreview($("pImageUrl").value);

    previewData = "";

    $("pId").readOnly = true;
    $("productSubmit").textContent = "Save Changes";
}

// Delete offer.
function deleteOffer(i) {
    offers.splice(i, 1);

    save();
    render();
}

// Navigation and modal close events.
document.addEventListener("click", e => {
    const b = e.target.closest("[data-go]");

    if (b) go(b.dataset.go);

    const n = e.target.closest(".nav-btn");

    if (n) go(n.dataset.page);

    if (e.target.dataset.close) {
        $(e.target.dataset.close).classList.add("hidden");
    }
});

// Profile controls.
$("brandProfile").onclick = $("profileBtn").onclick = openProfile;

$("closeProfileBtn").onclick =
    $("cancelProfileBtn").onclick = closeProfileWithoutSaving;

// Logout.
$("logoutBtn").onclick = () => {
    localStorage.removeItem("mf_logged");
    location.reload();
};

// Login.
$("loginForm").onsubmit = e => {
    e.preventDefault();

    if ($("loginPassword").value !== "Monirul@123") {
        toast("Incorrect password");
        return;
    }

    localStorage.setItem("mf_logged", "1");

    $("loginPage").classList.add("hidden");
    $("app").classList.remove("hidden");

    render();
};

// Open add-product modal.
$("openProductModal").onclick = () => {
    editingId = null;
    previewData = "";

    $("productForm").reset();
    $("pId").readOnly = false;
    $("pCategorySelect").value = "";
    $("pImageUrl").value = "";
    updateProductImagePreview("");

    $("productModalTitle").textContent = "Add Product";
    $("productSubmit").textContent = "Add Product";

    $("imagePreview").textContent =
        "Product images are managed with HTML img tags in index.html.";

    $("productModal").classList.remove("hidden");
};

// Category dropdown.
$("pCategorySelect").onchange = () => {
    if ($("pCategorySelect").value) {
        $("pCategory").value = $("pCategorySelect").value;
    }
};

$("pCategory").oninput = () => {
    const value = $("pCategory").value.trim();

    $("pCategorySelect").value = [...$("pCategorySelect").options]
        .some(o => o.value === value)
            ? value
            : "";
};

$("pImageUrl").addEventListener("input", event => {
    updateProductImagePreview(event.target.value);
});

// Add or update a product.
$("productForm").onsubmit = event => {
    event.preventDefault();

    const name = $("pName").value.trim();
    const category = $("pCategory").value.trim();
    const price = Number($("pPrice").value);
    const stock = Number($("pStock").value);
    const id = $("pId").value.trim() ||
        `MF${String(Math.max(0, ...products.map(p => Number(String(p.id).replace(/\D/g, "")) || 0)) + 1).padStart(3, "0")}`;

    if (!name || !category || !Number.isFinite(price) || price < 0 ||
        !Number.isFinite(stock) || stock < 0) {
        toast("Please enter valid product details.");
        return;
    }

    if (!editingId && products.some(p => p.id === id)) {
        toast("That product ID already exists.");
        return;
    }

    if (editingId) {
        const product = products.find(p => p.id === editingId);
        if (!product) return;

        product.name = name;
        product.category = category;
        product.price = price;
        product.stock = stock;
        product.image = safeImageUrl($("pImageUrl").value) || imageSource(category);
    } else {
        products.push({
            id,
            name,
            category,
            price,
            stock,
            sold: 0,
            image: safeImageUrl($("pImageUrl").value) || imageSource(category)
        });
    }

    save();
    $("productModal").classList.add("hidden");
    $("productForm").reset();
    $("pId").readOnly = false;
    editingId = null;
    render();
    toast("Product saved successfully.");
};

// Record a sale.
$("saveSale").onclick = () => {
    if (!selectedProduct) {
        toast("Please search for and select a product first.");
        return;
    }

    const product = products.find(p => p.id === selectedProduct.id);
    const qty = Math.floor(Number($("saleQty").value));
    const price = Number($("saleUnitPrice").value);
    const discount = Math.max(
        0,
        Math.min(100, Number($("saleDiscount").value || 0))
    );

    if (!product || !Number.isFinite(qty) || qty < 1 || qty > product.stock) {
        toast("Please enter a valid quantity within available stock.");
        return;
    }

    if (!Number.isFinite(price) || price < 0) {
        toast("Please enter a valid sales price.");
        return;
    }

    const before = price * qty;
    const discountAmount = before * discount / 100;
    const total = before - discountAmount;
    const salesId = `SALE-${String(sales.length + 1).padStart(4, "0")}`;

    sales.push({
        salesId,
        productId: product.id,
        product: product.name,
        qty,
        price,
        discount,
        discountAmount,
        total,
        date: dateISO(new Date())
    });

    product.stock -= qty;
    product.sold = Number(product.sold || 0) + qty;
    selectedProduct = null;

    $("saleSearch").value = "";
    $("saleId").value = "";
    $("saleProductId").value = "";
    $("saleProductPrice").value = "";
    $("saleUnitPrice").value = "0";
    $("saleQty").value = "1";
    $("saleDiscount").value = "0";
    updateSaleTotals();

    save();
    render();
    toast("Sale recorded successfully.");
};

// Update sale total whenever sale inputs change.
["saleUnitPrice", "saleQty", "saleDiscount"].forEach(id => {
    $(id).addEventListener("input", updateSaleTotals);
});

$("saleSearch").addEventListener("input", renderSales);
$("productSearch").addEventListener("input", renderProducts);
$("categoryFilter").addEventListener("change", renderProducts);

// Create a promotional offer.
$("offerForm").onsubmit = event => {
    event.preventDefault();

    const product = products.find(p => p.id === $("oProduct").value);
    const title = $("oTitle").value.trim();
    const discount = Number($("oDiscount").value);
    const start = $("oStart").value;
    const end = $("oEnd").value;

    if (!product || !title || !Number.isFinite(discount) ||
        discount <= 0 || discount > 100 || !start || !end || end < start) {
        toast("Please enter valid offer details and dates.");
        return;
    }

    offers.push({
        title,
        discount,
        productId: product.id,
        product: product.name,
        start,
        end
    });

    save();
    $("offerForm").reset();
    $("oDiscount").value = "20";
    $("offerModal").classList.add("hidden");
    render();
    toast("Offer created successfully.");
};

$("oProduct").addEventListener("change", updateOfferPreview);
$("oDiscount").addEventListener("input", updateOfferPreview);

$("openOfferModal").onclick = () => {
    $("offerForm").reset();
    $("oDiscount").value = "20";
    $("offerModal").classList.remove("hidden");
    populateOfferProducts();
};

// Save business profile details.
$("profileForm").onsubmit = event => {
    event.preventDefault();

    const profile = {
        business: $("profileBusiness").value.trim(),
        owner: $("profileOwner").value.trim(),
        email: $("profileEmail").value.trim(),
        address: $("profileAddress").value.trim(),
        about: $("profileAbout").value.trim()
    };

    localStorage.setItem(KEY.profile, JSON.stringify(profile));
    profileImage = pendingProfileImage;

    if (profileImage) {
        localStorage.setItem(KEY.profileImage, profileImage);
    } else {
        localStorage.removeItem(KEY.profileImage);
    }

    $("profileBtn").lastElementChild.textContent = profile.owner || "Monirul Islam";
    $("profileModal").classList.add("hidden");
    toast("Business profile saved.");
};

// Preview and save a business profile image.
$("ownerImageInput").addEventListener("change", event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        toast("Please select an image file.");
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        pendingProfileImage = String(reader.result || "");
        applyProfileImage(pendingProfileImage);
    };

    reader.readAsDataURL(file);
});

// Export sales history as CSV.
$("exportBtn").onclick = () => {
    if (!sales.length) {
        toast("There are no sales to export.");
        return;
    }

    const columns = [
        "Sales ID",
        "Product ID",
        "Product",
        "Quantity",
        "Unit Price",
        "Discount (%)",
        "Discount Amount",
        "Total",
        "Date"
    ];

    const rows = sales.map(s => [
        s.salesId,
        s.productId,
        s.product,
        s.qty,
        s.price,
        s.discount,
        s.discountAmount,
        s.total,
        s.date
    ]);

    const csv = [columns, ...rows]
        .map(row => row.map(value =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
        ).join(","))
        .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "monirul-fashion-sales.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
};

// Set up the app on first load.
(function initialiseApp() {
    const profile = JSON.parse(localStorage.getItem(KEY.profile) || "{}");

    if (profile.owner) {
        $("profileBtn").lastElementChild.textContent = profile.owner;
    }

    applyProfileImage(profileImage);
})();