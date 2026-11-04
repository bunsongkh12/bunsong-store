const PRODUCTS_KEY = "bunsongProducts";
const CART_KEY = "bunsongCart";
const validCategories = ["roblox", "cs2", "subscriptions"];
const categoryLabels = {
    roblox: "Roblox",
    cs2: "CS2",
    subscriptions: "Subscriptions"
};
const productTypes = {
    roblox: ["Robux top-up", "Roblox account"],
    cs2: ["CS2 skin"],
    subscriptions: ["YouTube Premium", "Spotify Premium", "Other subscription"]
};

function readStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        console.error(`Could not read ${key} from browser storage.`, error);
        return fallback;
    }
}

function saveStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Could not save ${key} to browser storage.`, error);
        return false;
    }
}

let products = readStorage(PRODUCTS_KEY, []);
if (!Array.isArray(products)) {
    products = [];
}
products = products.filter(product =>
    product &&
    typeof product.id === "string" &&
    validCategories.includes(product.game) &&
    typeof product.name === "string" &&
    Number.isFinite(Number(product.price)) &&
    Number(product.price) > 0
);

let cart = readStorage(CART_KEY, []);
if (!Array.isArray(cart)) {
    cart = [];
}
cart = cart.filter(item =>
    item &&
    typeof item.name === "string" &&
    Number.isFinite(Number(item.price)) &&
    Number(item.price) > 0 &&
    (item.productId === undefined || typeof item.productId === "string")
);

const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
});

function createProductCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.name = `${product.name} ${product.type || ""}`.toLowerCase();

    const imageWrap = document.createElement("div");
    imageWrap.className = "product-image-wrap";
    if (product.image) {
        const image = document.createElement("img");
        image.className = "product-image";
        image.src = product.image;
        image.alt = product.name;
        image.loading = "lazy";
        imageWrap.append(image);
    } else {
        const placeholder = document.createElement("span");
        placeholder.className = "product-placeholder";
        placeholder.setAttribute("aria-hidden", "true");
        placeholder.textContent = product.game === "roblox"
            ? "🎀"
            : product.game === "cs2" ? "🔫" : "▶";
        imageWrap.append(placeholder);
    }

    const details = document.createElement("div");
    details.className = "product-details";
    const type = document.createElement("span");
    type.className = `product-tag ${product.game === "cs2" ? "tag-blue" : "tag-pink"}`;
    type.textContent = product.type || `${categoryLabels[product.game]} item`;

    const name = document.createElement("h3");
    name.textContent = product.name;
    const description = document.createElement("p");
    description.textContent = product.description || "A little something for your next game.";
    const stock = document.createElement("span");
    stock.className = "product-stock";
    const hasStock = Number.isInteger(product.stock) && product.stock >= 0;
    if (!hasStock) {
        stock.classList.add("stock-unset");
        stock.textContent = "♡ Check availability";
    } else if (product.stock === 0) {
        stock.classList.add("stock-out");
        stock.textContent = "♡ Sold out";
    } else if (product.stock <= 3) {
        stock.classList.add("stock-low");
        stock.textContent = `♡ Only ${product.stock} left!`;
    } else {
        stock.classList.add("stock-available");
        stock.textContent = `♡ ${product.stock} in stock`;
    }
    const bottom = document.createElement("div");
    bottom.className = "product-bottom";
    const price = document.createElement("strong");
    price.className = "product-price";
    price.textContent = money.format(Number(product.price));
    const addButton = document.createElement("button");
    addButton.className = "add-button";
    addButton.type = "button";
    const inCart = cart.filter(item => item.productId === product.id).length;
    const unavailable = !hasStock || product.stock === 0 || inCart >= product.stock;
    addButton.textContent = !hasStock
        ? "Set stock"
        : product.stock === 0 ? "Out of stock" : inCart >= product.stock ? "In cart" : "Add to cart";
    addButton.disabled = unavailable;
    addButton.setAttribute("aria-label", `Add ${product.name} to cart`);
    addButton.addEventListener("click", () => addToCart(product));

    bottom.append(price, addButton);
    details.append(type, name, description, stock, bottom);
    card.append(imageWrap, details);
    return card;
}

function renderProducts() {
    document.querySelectorAll("[data-product-grid]").forEach(grid => {
        const game = grid.dataset.productGrid;
        const gameProducts = products.filter(product => product.game === game);
        grid.replaceChildren();

        if (gameProducts.length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-state";
            empty.textContent = "New goodies are on the way! Check back soon. ♡";
            grid.append(empty);
            return;
        }

        gameProducts.forEach(product => grid.append(createProductCard(product)));
    });
}

function renderCart() {
    const count = document.getElementById("cart-count");
    const items = document.getElementById("cart-items");
    const total = document.getElementById("cart-total");
    const checkoutButton = document.getElementById("checkout-button");
    const paywayButton = document.getElementById("payway-button");
    if (count) {
        count.textContent = String(cart.length);
    }
    if (!items || !total) {
        return;
    }

    items.replaceChildren();
    if (cart.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-cart";
        empty.textContent = "Your cart is waiting for its first goodie. ♡";
        items.append(empty);
    }

    let sum = 0;
    cart.forEach((item, index) => {
        sum += Number(item.price);
        const row = document.createElement("div");
        row.className = "cart-row";
        const info = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = item.name;
        const price = document.createElement("span");
        price.textContent = money.format(Number(item.price));
        info.append(name, price);
        const remove = document.createElement("button");
        remove.className = "remove-button";
        remove.type = "button";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", `Remove ${item.name} from cart`);
        remove.addEventListener("click", () => {
            cart.splice(index, 1);
            saveStorage(CART_KEY, cart);
            renderCart();
            renderProducts();
        });
        row.append(info, remove);
        items.append(row);
    });
    total.textContent = money.format(sum);
    if (checkoutButton) {
        const orderMessage = [
            "Hi Bunsong! I'd like to order:",
            ...cart.map(item => `- ${item.name} (${money.format(Number(item.price))})`),
            `Total: ${money.format(sum)}`
        ].join("\n");
        checkoutButton.href = cart.length
            ? `https://t.me/Bunsong_ung?text=${encodeURIComponent(orderMessage)}`
            : "https://t.me/Bunsong_ung";
        checkoutButton.setAttribute("aria-disabled", String(cart.length === 0));
    }
    if (paywayButton) {
        paywayButton.hidden = cart.length === 0;
    }
}

let toastTimeout;
function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) {
        return;
    }
    toast.textContent = message;
    toast.classList.add("toast-visible");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove("toast-visible"), 2400);
}

function addToCart(product) {
    const currentProduct = products.find(item => item.id === product.id);
    if (!currentProduct || !Number.isInteger(currentProduct.stock) || currentProduct.stock <= 0) {
        showToast("This item is out of stock or needs its stock quantity set.");
        return;
    }
    const inCart = cart.filter(item => item.productId === currentProduct.id).length;
    if (inCart >= currentProduct.stock) {
        showToast("Your cart already has all the available stock for this item.");
        return;
    }
    cart.push({
        name: currentProduct.name,
        price: Number(currentProduct.price),
        productId: currentProduct.id
    });
    if (!saveStorage(CART_KEY, cart)) {
        cart.pop();
        showToast("Couldn't save your cart. Please check your browser storage.");
        return;
    }
    renderCart();
    renderProducts();
    showToast(`${product.name} added to your cart! ♡`);
}

function renderOwnerProducts() {
    const list = document.getElementById("owner-products");
    if (!list) {
        return;
    }
    list.replaceChildren();
    if (products.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No listings yet — add your first goodie above!";
        list.append(empty);
        return;
    }

    products.forEach(product => {
        const row = document.createElement("div");
        row.className = "owner-product";
        if (product.image) {
            const image = document.createElement("img");
            image.src = product.image;
            image.alt = "";
            row.append(image);
        }
        const info = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = product.name;
        const meta = document.createElement("span");
        meta.textContent = `${categoryLabels[product.game]} · ${money.format(Number(product.price))}`;
        const stockLabel = document.createElement("span");
        stockLabel.textContent = Number.isInteger(product.stock)
            ? `Stock: ${product.stock}`
            : "Stock not set — set a quantity to list this item.";
        info.append(name, meta);

        const stockControls = document.createElement("div");
        stockControls.className = "owner-stock-controls";
        const stockInput = document.createElement("input");
        stockInput.className = "owner-stock-input";
        stockInput.type = "number";
        stockInput.min = "0";
        stockInput.max = "999999";
        stockInput.step = "1";
        stockInput.inputMode = "numeric";
        stockInput.setAttribute("aria-label", `Stock quantity for ${product.name}`);
        stockInput.placeholder = "Quantity";
        stockInput.value = Number.isInteger(product.stock) ? String(product.stock) : "";

        const saveStock = document.createElement("button");
        saveStock.className = "stock-button";
        saveStock.type = "button";
        saveStock.textContent = "Save stock";
        saveStock.addEventListener("click", () => {
            const value = stockInput.value.trim();
            if (!value) {
                showFormMessage("Enter a whole stock quantity from 0 to 999999.", true);
                return;
            }
            const quantity = Number(value);
            if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999999) {
                showFormMessage("Enter a whole stock quantity from 0 to 999999.", true);
                return;
            }
            updateProductStock(product, quantity);
        });

        const confirmSale = document.createElement("button");
        confirmSale.className = "stock-button";
        confirmSale.type = "button";
        confirmSale.textContent = "Confirm 1 sold";
        confirmSale.disabled = !Number.isInteger(product.stock) || product.stock <= 0;
        confirmSale.addEventListener("click", () => {
            if (!window.confirm(`Confirm that one ${product.name} was sold? This will reduce stock by 1.`)) {
                return;
            }
            updateProductStock(product, product.stock - 1);
        });

        stockControls.append(stockInput, saveStock, confirmSale);
        info.append(stockLabel, stockControls);

        const remove = document.createElement("button");
        remove.className = "remove-button";
        remove.type = "button";
        remove.textContent = "Remove";
        remove.addEventListener("click", () => {
            const updatedProducts = products.filter(item => item.id !== product.id);
            if (!saveStorage(PRODUCTS_KEY, updatedProducts)) {
                renderOwnerProducts();
                showFormMessage("Couldn't save that change. Please check browser storage.", true);
                return;
            }
            products = updatedProducts;
            renderProducts();
            renderOwnerProducts();
            showToast("Listing removed.");
        });
        row.append(info, remove);
        list.append(row);
    });
}

function updateProductStock(product, stock) {
    const updatedProducts = products.map(item =>
        item.id === product.id ? { ...item, stock } : item
    );
    if (!saveStorage(PRODUCTS_KEY, updatedProducts)) {
        showFormMessage("Couldn't save stock. Please check browser storage.", true);
        return;
    }
    products = updatedProducts;
    renderProducts();
    renderOwnerProducts();
    showFormMessage("Stock updated.", false);
}

function showFormMessage(message, isError) {
    const element = document.getElementById("form-message");
    if (!element) {
        return;
    }
    element.textContent = message;
    element.classList.toggle("message-error", Boolean(isError));
}

function resizeProductImage(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith("image/")) {
            reject(new Error("Please choose an image file."));
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            reject(new Error("That image is over 10 MB. Please choose a smaller photo."));
            return;
        }

        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const maxSide = 700;
            const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            const context = canvas.getContext("2d");
            if (!context) {
                reject(new Error("Your browser couldn't prepare that image."));
                return;
            }
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            try {
                resolve(canvas.toDataURL("image/jpeg", 0.72));
            } catch (error) {
                reject(new Error("Couldn't prepare that image. Please try another photo."));
            }
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Couldn't open that image. Please choose another one."));
        };
        image.src = objectUrl;
    });
}

const productForm = document.getElementById("product-form");
const ownerSection = document.getElementById("owner-tools");
if (ownerSection && new URLSearchParams(window.location.search).get("owner") === "1") {
    ownerSection.hidden = false;
    renderOwnerProducts();
}

if (productForm) {
    const gameInput = document.getElementById("product-game");
    const typeInput = document.getElementById("product-type");
    const imageInput = document.getElementById("product-image");
    const preview = document.getElementById("image-preview");
    let selectedImage = "";

    function updateProductTypes() {
        typeInput.replaceChildren(...productTypes[gameInput.value].map(type => {
            const option = document.createElement("option");
            option.value = type;
            option.textContent = type;
            return option;
        }));
    }

    gameInput.addEventListener("change", () => {
        updateProductTypes();
    });
    updateProductTypes();

    imageInput.addEventListener("change", async () => {
        selectedImage = "";
        preview.hidden = true;
        const file = imageInput.files && imageInput.files[0];
        if (!file) {
            return;
        }
        showFormMessage("Getting your photo ready…", false);
        try {
            selectedImage = await resizeProductImage(file);
            preview.src = selectedImage;
            preview.hidden = false;
            showFormMessage("Photo ready! Nice choice. ♡", false);
        } catch (error) {
            console.error("Could not prepare listing image.", error);
            showFormMessage(error.message, true);
            imageInput.value = "";
        }
    });

    productForm.addEventListener("submit", event => {
        event.preventDefault();
        if (!selectedImage) {
            showFormMessage("Please choose a product photo first.", true);
            return;
        }

        const game = gameInput.value;
        const price = Number(document.getElementById("product-price").value);
        const stock = Number(document.getElementById("product-stock").value);
        if (!validCategories.includes(game) ||
            !Array.from(typeInput.options).some(option => option.value === typeInput.value) ||
            !Number.isFinite(price) ||
            price <= 0 ||
            !Number.isInteger(stock) ||
            stock < 0 ||
            stock > 999999) {
            showFormMessage("Please check the category, price, and whole stock quantity.", true);
            return;
        }

        const product = {
            id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            game,
            type: typeInput.value,
            name: document.getElementById("product-name").value.trim(),
            description: document.getElementById("product-description").value.trim(),
            price,
            image: selectedImage,
            stock
        };
        const updatedProducts = [...products, product];
        if (!saveStorage(PRODUCTS_KEY, updatedProducts)) {
            showFormMessage("Couldn't save this listing. Browser storage may be full.", true);
            return;
        }

        products = updatedProducts;
        renderProducts();
        renderOwnerProducts();
        productForm.reset();
        updateProductTypes();
        selectedImage = "";
        preview.removeAttribute("src");
        preview.hidden = true;
        showFormMessage("Listing added! It’s ready in your shop. ♡", false);
        const productGrid = document.querySelector(`[data-product-grid="${game}"]`);
        if (productGrid) {
            productGrid.scrollIntoView({ behavior: "smooth" });
        }
    });
}

const cartDialog = document.getElementById("cart-dialog");
const openCart = document.getElementById("open-cart");
const closeCart = document.getElementById("close-cart");
if (cartDialog && openCart && closeCart) {
    openCart.addEventListener("click", () => {
        renderCart();
        cartDialog.showModal();
    });
    closeCart.addEventListener("click", () => cartDialog.close());
    cartDialog.addEventListener("click", event => {
        if (event.target === cartDialog) {
            cartDialog.close();
        }
    });
}

renderProducts();
renderCart();
