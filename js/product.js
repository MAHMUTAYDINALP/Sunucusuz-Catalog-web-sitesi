
let allProducts = [];
let popularSets = [];
let currentSetIndex = 0;
let sliderInterval;
let isAnimating = false;

let startX = 0;
let startTime = 0;
let isDragging = false;
const timeThreshold = 200; 
const moveThreshold = 5; 

// --- 1. TÜRKÇE KARAKTER VE TEMİZLİK FONKSİYONU ---
function normalizeText(text) {
    if (!text) return "";
    return text.toString()
        .replace(/İ/g, 'i').replace(/I/g, 'i')
        .replace(/ı/g, 'i').replace(/i/g, 'i')
        .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
        .replace(/Ü/g, 'u').replace(/ü/g, 'u')
        .replace(/Ş/g, 's').replace(/ş/g, 's')
        .replace(/Ö/g, 'o').replace(/ö/g, 'o')
        .replace(/Ç/g, 'c').replace(/ç/g, 'c')
        .toLowerCase().trim();
}

// --- 2. SİSTEM BAŞLATICI ---
document.addEventListener("DOMContentLoaded", () => {
    fetch("data/product.json")
        .then(res => res.json())
        .then(data => {
            allProducts = data.products || data || [];
            
            // VERİLER GELDİĞİ ANDA ÇALIŞACAK FONKSİYONLAR
            initTickers();
            loadBrandTicker(); // Marka kaydırıcıyı başlat
            loadMostLiked();   // EN ÖNEMLİSİ: Beğenilen ürünleri burada çağırıyoruz

            const urlParams = new URLSearchParams(window.location.search);
            const catParam = urlParams.get("cat");
            const searchParam = urlParams.get("search");
            const popularLayout = document.getElementById("popular-layout");

            if (popularLayout) {
                const populars = allProducts.filter(p => p.p_pop === true);
                popularSets = [];
                for (let i = 0; i < populars.length; i += 2) {
                     const set = populars.slice(i, i + 2);
                    if(set.length === 2) popularSets.push(set); // Sadece tam 2'li olan setleri alır
                    }

                if (catParam) {
                    filterByCategory(catParam);
                } else if (searchParam) {
                    const searchInput = document.getElementById("search");
                    if (searchInput) searchInput.value = searchParam;
                    performSearch();
                } else if (popularSets.length > 0) {
                    renderHeroSet(popularSets[0]);
                    if (popularSets.length > 1) {
                        startAutoSlider();
                        initManualSwipe();
                    }
                }
            }
            setupSearch();
        })
        .catch(err => console.error("Veri yüklenemedi:", err));
});

// --- 3. ŞERİT (TICKER) ---
// --- 3. ŞERİT (TICKER) - 15+15 FARKLI ÜRÜN AYARI ---
function initTickers() {
    const topTicker = document.getElementById("ticker-right"); // Üst şerit
    const bottomTicker = document.getElementById("ticker-left"); // Alt şerit
    
    if (!topTicker || !bottomTicker || allProducts.length < 30) return;

    // 1. Tüm listeyi karıştır
    const shuffled = [...allProducts].sort(() => 0.5 - Math.random());

    // 2. İlk 15 ürünü üst şerit için al
    const setTop = shuffled.slice(0, 15);
    
    // 3. Sonraki 15 ürünü (15. indisten 30'a kadar) alt şerit için al
    const setBottom = shuffled.slice(15, 30);

    // Üst Şeridi Oluştur (Sola Kayar)
    const topContent = setTop.map(p => `
        <div class="ticker-item" onclick="goToDetail('${p.p_name}')">
            <img src="${getSecureImgPath(p.p_img)}" loading="lazy" onerror="this.src='img/logo.png'">
        </div>
    `).join('');

    // Alt Şeridi Oluştur (Sağa Kayar)
    const bottomContent = setBottom.map(p => `
        <div class="ticker-item" onclick="goToDetail('${p.p_name}')">
            <img src="${getSecureImgPath(p.p_img)}" loading="lazy" onerror="this.src='img/logo.png'">
        </div>
    `).join('');

    // Sonsuz döngü için içerikleri ikişer kez ekliyoruz
    topTicker.innerHTML = topContent + topContent;
    bottomTicker.innerHTML = bottomContent + bottomContent;
}

// --- 4. KATEGORİ FİLTRELEME ---
function filterByCategory(cat) {
    const resultsArea = document.getElementById("product-list-area");
    // Eğer detay sayfasındaysak index'e yönlendir
    if (!resultsArea) {
        window.location.href = `index.html?cat=${encodeURIComponent(cat)}`;
        return;
    }
    const searchCatNormalized = normalizeText(cat);
    const filtered = allProducts.filter(p => {
        const productCatNormalized = normalizeText(p.p_cat);
        return productCatNormalized.includes(searchCatNormalized.split(' ')[0]);
    });
    renderGeneralList(filtered, cat);
}

// --- 5. MARKA DROPDOWN (GÜNCELLENMİŞ) ---
function showBrands(category) {
    // 1. ADIM: Hata Önleme - Diğer tüm açık dropdownları kapat
    document.querySelectorAll('.brand-dropdown').forEach(div => {
        div.style.display = 'none';
    });

    const searchCatNormalized = normalizeText(category);

    // 2. ADIM: Kategoriye göre ürünleri filtrele
    const filteredProducts = allProducts.filter(p => {
        const productCatNormalized = normalizeText(p.p_cat);
        // Kategori isminin ilk kelimesine göre eşleştirme (Plastik, Metal vb.)
        return productCatNormalized.includes(searchCatNormalized.split(' ')[0]);
    });

    // 3. ADIM: Markaları al ve ALASKA/GOLF olanları filtrele
    const brands = [...new Set(filteredProducts.map(p => p.p_brand))]
        .filter(b => {
            if (!b) return false;
            const upperB = b.toUpperCase();
            // Alaska ve Golf markalarının listede görünmesini engeller
            return upperB !== 'ALASKA' && upperB !== 'GOLF';
        });

    // 4. ADIM: Doğru ID tespiti
    let id = "";
    if (searchCatNormalized.includes("plastik")) id = "brands-Plastik";
    else if (searchCatNormalized.includes("promosyon")) id = "brands-Promosyon";
    else if (searchCatNormalized.includes("metal")) id = "brands-Metal";
    else id = "brands-Diger";

    const dropdown = document.getElementById(id);
    if (dropdown) {
        // Dropdown'u görünür yap
        dropdown.style.display = 'flex';

        // 5. ADIM: Marka logolarını HTML olarak bas
        dropdown.innerHTML = brands.map(b => {
            // Dosya isimlerini normalize et (Boşluk yerine tire koy)
            let fileName = normalizeText(b).replace(/\s+/g, '-');
            return `
                <a href="javascript:void(0)" class="brand-img-link" 
                   onclick="event.stopPropagation(); executeBrandSearch('${b}', '${category}')">
                    <img src="brands/${fileName}.png" loading="lazy" onerror="this.src='img/logo.png'">
                </a>
            `;
        }).join('');
    }
}

// --- 6. MARKA FİLTRELEME ---
function executeBrandSearch(brandName, categoryName) {
    const searchInput = document.getElementById("search");
    if (searchInput) searchInput.value = brandName;
    const sBrand = normalizeText(brandName);
    const sCat = normalizeText(categoryName);
    const filtered = allProducts.filter(p => {
        const pBrand = normalizeText(p.p_brand);
        const pCat = normalizeText(p.p_cat);
        const isBrandMatch = (pBrand === sBrand);
        const catFirstWord = sCat.split(' ')[0]; 
        const isCatMatch = pCat.includes(catFirstWord) || catFirstWord.includes(pCat);
        return isBrandMatch && isCatMatch;
    });
    renderGeneralList(filtered, `${categoryName} > ${brandName}`);
}
// --- 7. GENEL LİSTE OLUŞTURMA (PÜSKÜRTME SİSTEMİ) ---
function renderGeneralList(products, title) {
    const area = document.getElementById("popular-hero-area");
    if (!area) return;

    clearInterval(sliderInterval);

    // KRİTİK DÜZELTME: Sabit yüksekliği kaldırıyoruz ki aşağı doğru uzasın
    area.style.height = "auto"; 
    area.style.minHeight = "500px"; // Boş kalmasın diye bir taban veriyoruz

    area.innerHTML = `
        <div style="width:100%; display:flex; flex-direction:column; align-items:center; padding: 20px 0;">
            <h2 id="section-title" style="width:90%; text-align:left; font-size: 24px; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 10px;">
                ${title}
            </h2>
            <div class="general-grid" id="general-list"></div>
        </div>
    `;

    const list = document.getElementById("general-list");
    if (products.length === 0) {
        list.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding: 50px;">Ürün bulunamadı.</p>`;
    } else {
        list.innerHTML = products.map(p => `
            <div class="product-card" onclick="goToDetail('${p.p_name}')">
                <img src="${getSecureImgPath(p.p_img)}" loading="lazy" onerror="this.src='img/logo.png'">
                <small style="color:#888; text-transform:uppercase; display:block; margin:5px 0;">${p.p_brand}</small>
                <h4 style="margin:0; font-size: 15px; color: #222;">${p.p_name}</h4>
            </div>
        `).join('');
    }

    // Scroll ayarını biraz esnetelim
    window.scrollTo({ top: area.offsetTop - 120, behavior: "smooth" });
}
// --- 8. ARAMA FONKSİYONLARI ---
function performSearch() {
    const searchInput = document.getElementById("search");
    if (!searchInput) return;
    const term = normalizeText(searchInput.value);
    
    // Eğer boş arama yapılırsa ana sayfaya dön
    if (!term) {
        clearSearch();
        return;
    }

    const filtered = allProducts.filter(p => 
        normalizeText(p.p_name).includes(term) || 
        normalizeText(p.p_brand).includes(term)
    );
    renderGeneralList(filtered, `"${term}" İçin Sonuçlar`);
}

function setupSearch() {
    const btn = document.getElementById("search-btn");
    const input = document.getElementById("search");
    if (btn) btn.onclick = performSearch;
    if (input) input.onkeypress = (e) => { if (e.key === 'Enter') performSearch(); };
}

// --- 9. SLIDER ---
function renderHeroSet(products) {
    const container = document.getElementById("popular-layout");
    if (!container) return;
    container.innerHTML = products.map((p, index) => `
        <div class="hero-item ${index === 0 ? 'item-big' : ''}" data-name="${p.p_name}">
            <img src="${p.p_img}" alt="${p.p_name}" draggable="false" loading="lazy" onerror="this.src='img/logo.png'">
        </div>
    `).join('');
}

function startAutoSlider() {
    clearInterval(sliderInterval);
    sliderInterval = setInterval(() => moveSlider(1), 7000);
}

// İkinci parametre olarak isManual ekledik
function moveSlider(direction, touchedItem = null) {
    if (isAnimating || popularSets.length < 2) return;
    isAnimating = true;

    const heroItems = document.querySelectorAll('.hero-item');
    const nextIndex = (currentSetIndex + direction + popularSets.length) % popularSets.length;
    const nextSet = popularSets[nextIndex];

    heroItems.forEach((item, i) => {
        // --- KRİTİK MANTIK BURADA ---
        // Eğer bir öğeye dokunulmuşsa (touchedItem varsa), sadece O ÖĞEYİ kaydır.
        // Eğer dokunulan bir öğe yoksa (otomatik kaymaysa), HEPSİNİ kaydır.
        const shouldAnimate = !touchedItem || item === touchedItem;

        if (shouldAnimate) {
            const currentImg = item.querySelector('img');
            const nextImg = document.createElement('img');
            nextImg.src = nextSet[i].p_img;
            
            // Yöne göre animasyon sınıfını ekle
            nextImg.className = direction > 0 ? 'slide-left-in' : 'slide-right-in';
            item.appendChild(nextImg);

            if (currentImg) {
                currentImg.className = direction > 0 ? 'slide-left-out' : 'slide-right-out';
            }

            setTimeout(() => {
                if (currentImg) currentImg.remove();
                nextImg.className = ''; 
                item.setAttribute('data-name', nextSet[i].p_name);
            }, 800);
        }
    });

    // Animasyon bitişini yönet
    setTimeout(() => {
        currentSetIndex = nextIndex;
        isAnimating = false;
    }, 850);
}

// --- 10. DETAY SAYFASI VE MODALLAR ---
function goToDetail(name) { window.location.href = `detail.html?name=${encodeURIComponent(name)}`; }

function loadProductDetail(name) {
    fetch("data/product.json").then(res => res.json()).then(data => {
        const list = data.products || data || []; 
        const p = list.find(x => normalizeText(x.p_name) === normalizeText(name));
        if (p) {
            document.getElementById("detail-img").src = p.p_img;
            document.getElementById("detail-title").innerText = p.p_name;
            document.getElementById("detail-brand").innerText = p.p_brand;
            document.getElementById("detail-desc").innerText = p.p_desc || "Detaylar için WhatsApp'tan ulaşın.";
            document.getElementById("whatsapp-btn").href = `https://wa.me/905050696639?text=${encodeURIComponent(p.p_name + ' hakkında bilgi alabilir miyim?')}`;
        }
    });
}

function initManualSwipe() {
    const layout = document.getElementById("popular-layout");
    if (!layout) return;
    layout.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startX = e.pageX;
        startTime = Date.now();
        isDragging = false;
        clearInterval(sliderInterval);
    });
    layout.addEventListener('mousemove', (e) => {
        if (startTime === 0) return;
        if (Math.abs(e.pageX - startX) > moveThreshold) isDragging = true;
    });
    window.addEventListener('mouseup', (e) => {
        if (startTime === 0) return;
        handleActionEnd(e.pageX, e.target);
        startTime = 0;
    });
}
function handleActionEnd(endX, targetElement) {
    const duration = Date.now() - startTime;
    const diff = startX - endX;
    const absDiff = Math.abs(diff);

    if (absDiff < 50 && duration < 250) {
        const heroItem = targetElement.closest('.hero-item');
        if (heroItem) goToDetail(heroItem.getAttribute('data-name'));
    } else if (absDiff >= 70) { 
        // Dokunulan öğeyi (hero-item) bul ve moveSlider'a gönder
        const touchedItem = targetElement.closest('.hero-item');
        moveSlider(diff > 0 ? 1 : -1, touchedItem); 
    }
    startAutoSlider();
}

function openContact() { document.getElementById("contact-modal").style.display = "block"; }
function closeContact() { document.getElementById("contact-modal").style.display = "none"; }

// --- 11. MARKA VE EN BEĞENİLENLER ---
function loadBrandTicker() {
    const brandTicker = document.getElementById('brand-logos-ticker');
    if (!brandTicker) return;

    const brands = [
        { name: 'bk-jet', img: 'brands/bk-jet.png' },
        { name: 'campin', img: 'brands/campin.png' },
        { name: 'Clipper', img: 'brands/clipper.png' },
        { name: 'copper', img: 'brands/copper.png' },
        { name: 'diger', img: 'brands/diger.png' },
        { name: 'fer', img: 'brands/fer.png' },
        { name: 'koko', img: 'brands/koko.png' },
        { name: 'I-Lighter', img: 'brands/i-lighter.png' },
        { name: 'kasai', img: 'brands/kasai.png' },
        { name: 'mry', img: 'brands/mry.png' },
        { name: 'par', img: 'brands/par.png' },
        { name: 'silvio monetti', img: 'brands/silvio-monetti.png' },
        { name: 'str', img: 'brands/str.png' },
        { name: 'tokai', img: 'brands/tokai.png' },
        { name: 'zippo', img: 'brands/zippo.png' }
    ];

    const tripleBrands = [...brands, ...brands, ...brands];
    brandTicker.innerHTML = tripleBrands.map(brand => `
        <div class="ticker-item">
            <img src="${brand.img}" alt="${brand.name}" title="${brand.name}">
        </div>
    `).join('');
}
function loadMostLiked() {
    // Sabit tutmak istediğimiz resimlerin listesi
    const targets = ["img/2.webp", "img/10.webp", "img/20.webp","img/23.webp","img/25.webp", "img/35.webp","img/36.webp","img/37.webp","img/38.webp", "img/62.webp", "img/79.webp","img/83.webp","img/91.webp","img/146.webp","img/147.webp", "img/81.webp"]; // Burayı 15 resme tamamla
    
    const container = document.getElementById('most-liked-products');
    if (!container || allProducts.length === 0) return;

    // 1. ADIM: Filtrele (Tüm eşleşenleri bulur)
    // 2. ADIM: Slice (Sadece ilk 15 tanesini kesip alır)
    const featured = allProducts
        .filter(p => targets.includes(p.p_img)) // Resim ismi eşleşenleri seç
        .slice(0, 15);                          // KAÇ ÜRÜN OLURSA OLSUN İLK 15'İ AL

    container.innerHTML = featured.map(p => `
        <div class="product-card" onclick="goToDetail('${p.p_name}')">
            <img src="${getSecureImgPath(p.p_img)}" loading="lazy">
            <h4 style="margin-top:10px; font-size:14px;">${p.p_name}</h4>
        </div>
    `).join('');
}

// Resim yolunu güvenli hale getiren fonksiyon
function getSecureImgPath(path) {
    if (!path) return "img/logo.png"; // Resim yoksa logo bas
    
    // Eğer yol zaten 'img/' ile başlıyorsa dokunma
    if (path.startsWith('img/')) return path;
    
    // Eğer başında '/' varsa (Örn: /28.png), slash'ı kaldır ve img/ ekle
    if (path.startsWith('/')) return 'img' + path;
    
    // Hiçbiri yoksa (Örn: 28.png), direkt img/ ekle
    return 'img/' + path;
}

// Bu fonksiyonu product.js dosyasının en dışına ekle
function toggleUIMode(isSearch) {
    const hero = document.getElementById('popular-hero-area'); // Slider
    const results = document.getElementById('product-list-area'); // Yeni eklediğimiz alan
    const liked = document.querySelector('.most-liked-section'); // En beğenilenler
    const tickers = document.querySelectorAll('.ticker-section'); // Kayan şeritler
    const categories = document.querySelector('.cat-images-section'); // Kategori resimleri

    if (isSearch) {
        // ARAMA MODU: Her şeyi gizle, sadece sonuçları ve kategorileri (en altta) göster
        if(hero) hero.style.display = 'none';
        if(liked) liked.style.display = 'none';
        tickers.forEach(t => t.style.display = 'none');
        
        results.style.display = 'block'; // Sonuçları aç
        // Sayfayı en tepeye (sonuçların başına) odakla
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        // ANA SAYFA MODU: Her şeyi geri getir
        if(hero) hero.style.display = 'block';
        if(liked) liked.style.display = 'block';
        tickers.forEach(t => t.style.display = 'block');
        results.style.display = 'none';
    }
}

// --- YENİ: ARAMAYI TEMİZLE VE ANA SAYFAYA DÖN ---
function clearSearch() {
    const searchInput = document.getElementById("search");
    if (searchInput) searchInput.value = "";
    
    // UI modunu "Ana Sayfa" (false) yap
    toggleUIMode(false);
    
    // Sayfayı en üste çıkar
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleUIMode(isSearch) {
    const hero = document.getElementById('popular-hero-area');
    const results = document.getElementById('product-list-area');
    const liked = document.querySelector('.most-liked-section');
    const tickers = document.querySelectorAll('.ticker-section');

    if (isSearch) {
        if(hero) hero.style.display = 'none';
        if(liked) liked.style.display = 'none';
        tickers.forEach(t => t.style.display = 'none');
        if(results) results.style.display = 'block';
    } else {
        if(hero) hero.style.display = 'block';
        if(liked) liked.style.display = 'block';
        tickers.forEach(t => t.style.display = 'block');
        if(results) results.style.display = 'none';
    }
}