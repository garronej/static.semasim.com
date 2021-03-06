(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var loadUiClassHtml_1 = require("../../../shared/dist/lib/loadUiClassHtml");
var ts_events_extended_1 = require("ts-events-extended");
var types = require("../../../shared/dist/lib/types/shop");
var env_1 = require("../../../shared/dist/lib/env");
var shipping_1 = require("../../../shared/dist/lib/shipping");
var currency_1 = require("../../../shared/dist/tools/currency");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiCart.html"), "UiCart");
require("../templates/UiCart.less");
var UiCart = /** @class */ (function () {
    function UiCart(currency, shipToCountryIso) {
        var _this = this;
        this.structure = html.structure.clone();
        this.evtUserClickCheckout = new ts_events_extended_1.VoidSyncEvent();
        this.uiCartEntries = [];
        this.structure.find(".id_checkout")
            .on("click", function () { return _this.evtUserClickCheckout.post(); });
        this.updateLocals({ currency: currency, shipToCountryIso: shipToCountryIso });
    }
    UiCart.prototype.getCart = function () {
        return this.uiCartEntries
            .map(function (_a) {
            var cartEntry = _a.cartEntry;
            return cartEntry;
        });
    };
    UiCart.prototype.updateLocals = function (locals) {
        var currency = locals.currency, shipToCountryIso = locals.shipToCountryIso;
        if (currency !== undefined) {
            this.currency = currency;
            for (var _i = 0, _a = this.uiCartEntries; _i < _a.length; _i++) {
                var uiShoppingBagEntry = _a[_i];
                uiShoppingBagEntry.updateCurrency(currency);
            }
        }
        if (shipToCountryIso !== undefined) {
            this.shipToCountryIso = shipToCountryIso;
        }
        this.updateTotal();
    };
    UiCart.prototype.updateTotal = function () {
        var cart = this.getCart();
        if (cart.length === 0) {
            this.structure.hide();
        }
        else {
            this.structure.show();
        }
        var shipping = shipping_1.solve(this.shipToCountryIso, types.Cart.getOverallFootprint(cart), types.Cart.getOverallWeight(cart));
        var cartPrice = types.Cart.getPrice(cart, currency_1.convertFromEuro);
        console.log("TODO: display delay ", shipping.delay);
        this.structure.find(".id_cart_price").text(types.Price.prettyPrint(cartPrice, this.currency, currency_1.convertFromEuro));
        this.structure.find(".id_shipping_price").text(types.Price.prettyPrint({ "eur": shipping.eurAmount }, this.currency, currency_1.convertFromEuro));
        this.structure.find(".id_cart_total").text(types.Price.prettyPrint(types.Price.addition(cartPrice, { "eur": shipping.eurAmount }, currency_1.convertFromEuro), this.currency, currency_1.convertFromEuro));
    };
    UiCart.prototype.addProduct = function (product) {
        var _this = this;
        {
            var uiCartEntry_1 = this.uiCartEntries.find(function (_a) {
                var cartEntry = _a.cartEntry;
                return cartEntry.product === product;
            });
            if (!!uiCartEntry_1) {
                uiCartEntry_1.simulatePlusClick();
                return;
            }
        }
        var uiCartEntry = new UiCartEntry({ product: product, "quantity": 1 }, this.currency);
        this.uiCartEntries.push(uiCartEntry);
        this.structure.find(".shopping-cart").append(uiCartEntry.structure);
        uiCartEntry.evtUserClickDelete.attachOnce(function () {
            _this.uiCartEntries.splice(_this.uiCartEntries.indexOf(uiCartEntry), 1);
            uiCartEntry.structure.detach();
            _this.updateTotal();
        });
        uiCartEntry.evtQuantityChanged.attach(function () {
            return _this.updateTotal();
        });
        this.updateTotal();
    };
    return UiCart;
}());
exports.UiCart = UiCart;
var UiCartEntry = /** @class */ (function () {
    function UiCartEntry(cartEntry, currency) {
        var _this = this;
        this.cartEntry = cartEntry;
        this.structure = html.templates.find(".id_UiCartEntry").clone();
        this.evtUserClickDelete = new ts_events_extended_1.VoidSyncEvent();
        this.evtQuantityChanged = new ts_events_extended_1.VoidSyncEvent();
        this.structure.find(".delete-btn").css("background", "url(\"" + env_1.assetsRoot + "svg/delete-icn.svg\") no-repeat center");
        for (var _i = 0, _a = ["plus", "minus"]; _i < _a.length; _i++) {
            var selector = _a[_i];
            this.structure.find("." + selector + "-btn img").attr("src", env_1.assetsRoot + "svg/" + selector + ".svg");
        }
        this.structure.find(".image img").attr("src", cartEntry.product.cartImageUrl);
        this.structure.find(".id_item_name").text(cartEntry.product.name);
        this.structure.find(".id_short_description").text(cartEntry.product.shortDescription);
        {
            var $input_1 = this.structure.find(".quantity input");
            $input_1.val(cartEntry.quantity);
            var updateCounter = function (op) { return (function (event) {
                event.preventDefault();
                var oldValue = cartEntry.quantity;
                var newValue = (op === "++" ? oldValue < 100 : oldValue > 1) ?
                    (oldValue + (op === "++" ? 1 : -1)) :
                    (op === "++" ? 100 : 1);
                if (newValue === oldValue) {
                    return;
                }
                $input_1.val(newValue);
                cartEntry.quantity = newValue;
                _this.updateDisplayedPrice();
                _this.evtQuantityChanged.post();
            }); };
            this.structure.find(".minus-btn").on("click", updateCounter("--"));
            this.structure.find(".plus-btn").on("click", updateCounter("++"));
        }
        this.structure.find(".delete-btn").one("click", function () { return _this.evtUserClickDelete.post(); });
        this.updateCurrency(currency);
    }
    UiCartEntry.prototype.simulatePlusClick = function () {
        this.structure.find(".plus-btn").trigger("click");
    };
    UiCartEntry.prototype.updateCurrency = function (currency) {
        this.currency = currency;
        this.updateDisplayedPrice();
    };
    UiCartEntry.prototype.updateDisplayedPrice = function () {
        var _this = this;
        this.structure.find(".total-price").html(types.Price.prettyPrint(types.Price.operation(this.cartEntry.product.price, function (amount) { return amount * _this.cartEntry.quantity; }), this.currency, currency_1.convertFromEuro));
    };
    return UiCartEntry;
}());

},{"../../../shared/dist/lib/env":30,"../../../shared/dist/lib/loadUiClassHtml":31,"../../../shared/dist/lib/shipping":32,"../../../shared/dist/lib/types/shop":34,"../../../shared/dist/tools/currency":37,"../templates/UiCart.html":17,"../templates/UiCart.less":18,"ts-events-extended":16}],2:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var loadUiClassHtml_1 = require("../../../shared/dist/lib/loadUiClassHtml");
var UiCart_1 = require("./UiCart");
var UiProduct_1 = require("./UiProduct");
var shopProducts_1 = require("../../../shared/dist/lib/shopProducts");
var env = require("../../../shared/dist/lib/env");
var UiShipTo_1 = require("./UiShipTo");
var currency_1 = require("../../../shared/dist/tools/currency");
var UiCurrency_1 = require("./UiCurrency");
var UiShippingForm_1 = require("./UiShippingForm");
var bootbox_custom = require("../../../shared/dist/tools/bootbox_custom");
var webApiCaller = require("../../../shared/dist/lib/webApiCaller");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiController.html"), "UiController");
var UiController = /** @class */ (function () {
    function UiController(defaultCountryIso) {
        var _this = this;
        this.structure = html.structure.clone();
        if (defaultCountryIso === undefined) {
            //TODO: change to "fr"
            defaultCountryIso = "us";
        }
        var currency = currency_1.getCountryCurrency(defaultCountryIso);
        var uiCurrency = new UiCurrency_1.UiCurrency(currency);
        $(".navbar-right").prepend(uiCurrency.structure);
        var uiShipTo = new UiShipTo_1.UiShipTo(defaultCountryIso);
        uiShipTo.evtChange.attach(function (shipToCountryIso) { return uiCurrency.change(currency_1.getCountryCurrency(shipToCountryIso)); });
        //We break the rules of our framework here by inserting outside of the ui structure...
        $(".navbar-right").prepend(uiShipTo.structure);
        var uiCart = new UiCart_1.UiCart(currency, defaultCountryIso);
        {
            var uiShippingAddress_1 = new UiShippingForm_1.UiShippingForm();
            uiCart.evtUserClickCheckout.attach(function () { return __awaiter(_this, void 0, void 0, function () {
                var shippingFormData, currency;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, uiShippingAddress_1.interact_getAddress()];
                        case 1:
                            shippingFormData = _a.sent();
                            if (shippingFormData === undefined) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, uiCurrency.interact_getCurrency()];
                        case 2:
                            currency = _a.sent();
                            this.interact_checkout(uiCart.getCart(), shippingFormData, currency);
                            return [2 /*return*/];
                    }
                });
            }); });
        }
        uiCurrency.evtChange.attach(function (currency) { return uiCart.updateLocals({ currency: currency }); });
        uiShipTo.evtChange.attach(function (shipToCountryIso) { return uiCart.updateLocals({ shipToCountryIso: shipToCountryIso }); });
        this.structure.find(".id_container").append(uiCart.structure);
        var _loop_1 = function (product) {
            var uiProduct = new UiProduct_1.UiProduct(product, currency);
            uiCurrency.evtChange.attach(function (currency) { return uiProduct.updateCurrency(currency); });
            uiProduct.evtUserClickAddToCart.attach(function () {
                uiCart.addProduct(product);
                $("html, body").animate({ "scrollTop": 0 }, "slow");
            });
            this_1.structure.find(".id_container")
                .append(uiProduct.structure);
        };
        var this_1 = this;
        for (var _i = 0, _a = shopProducts_1.getProducts(env.assetsRoot); _i < _a.length; _i++) {
            var product = _a[_i];
            _loop_1(product);
        }
    }
    UiController.prototype.interact_checkout = function (cart, shippingFormData, currency) {
        return __awaiter(this, void 0, void 0, function () {
            var url, _a, stripePublicApiKey, sessionId, stripe;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        bootbox_custom.loading("Redirecting to payment page");
                        url = window.location.href.split("?")[0];
                        return [4 /*yield*/, webApiCaller.createStripeCheckoutSessionForShop(cart, shippingFormData, currency, url + "?success=true", url + "?success=false")];
                    case 1:
                        _a = _b.sent(), stripePublicApiKey = _a.stripePublicApiKey, sessionId = _a.checkoutSessionId;
                        stripe = Stripe(stripePublicApiKey);
                        stripe.redirectToCheckout({ sessionId: sessionId })
                            .then(function (result) {
                            if (!!result.error) {
                                alert(result.error.message);
                            }
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    return UiController;
}());
exports.UiController = UiController;

},{"../../../shared/dist/lib/env":30,"../../../shared/dist/lib/loadUiClassHtml":31,"../../../shared/dist/lib/shopProducts":33,"../../../shared/dist/lib/webApiCaller":35,"../../../shared/dist/tools/bootbox_custom":36,"../../../shared/dist/tools/currency":37,"../templates/UiController.html":19,"./UiCart":1,"./UiCurrency":3,"./UiProduct":4,"./UiShipTo":5,"./UiShippingForm":6}],3:[function(require,module,exports){
"use strict";
//NOTE: Assert Select2 v4.0.6-rc.0 loaded.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var loadUiClassHtml_1 = require("../../../shared/dist/lib/loadUiClassHtml");
var ts_events_extended_1 = require("ts-events-extended");
var currencyLib = require("../../../shared/dist/tools/currency");
var bootbox_custom = require("../../../shared/dist/tools/bootbox_custom");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiCurrency.html"), "UiCurrency");
require("../templates/UiCurrency.less");
var UiCurrency = /** @class */ (function () {
    function UiCurrency(defaultCurrency) {
        var _this = this;
        this.structure = html.structure.clone();
        this.evtChange = new ts_events_extended_1.SyncEvent();
        this.evt$select_on_change = new ts_events_extended_1.VoidSyncEvent();
        this.structure.one("show.bs.dropdown", function () {
            var $select = _this.structure.find("select");
            var sortedCurrencies = Object.keys(currencyLib.data)
                .map(function (currency) { return ({ currency: currency, "count": currencyLib.data[currency].countriesIso.length }); })
                .sort(function (a, b) { return b.count - a.count; })
                .map(function (_a) {
                var currency = _a.currency;
                return currency;
            });
            for (var _i = 0, sortedCurrencies_1 = sortedCurrencies; _i < sortedCurrencies_1.length; _i++) {
                var currency = sortedCurrencies_1[_i];
                var $option = html.templates.find("option").clone();
                $option.attr("value", currency);
                var _a = currencyLib.data[currency], symbol = _a.symbol, name_1 = _a.name;
                $option.html(symbol + " - " + name_1);
                $select.append($option);
            }
            $select["select2"]();
            $select.on("change", function () { return _this.evt$select_on_change.post(); });
            _this.evt$select_on_change.attach(function () {
                _this.structure.find("a").trigger("click");
                _this.change($select.val());
            });
        });
        this.structure.on("shown.bs.dropdown", function () {
            var $select = _this.structure.find("select");
            if ($select.val() === _this.currency) {
                return;
            }
            _this.evt$select_on_change.attachOnceExtract(function () { });
            $select.val(_this.currency).trigger("change");
        });
        //NOTE: Preventing dropdown from closing.
        {
            var target_1;
            $("body").on("click", function (e) { target_1 = e.target; });
            this.structure.on("hide.bs.dropdown", function () {
                if (_this.structure.find("a").is(target_1)) {
                    return true;
                }
                if (_this.structure.has(target_1).length !== 0) {
                    return false;
                }
                if ($(".select2-dropdown").has(target_1).length !== 0) {
                    return false;
                }
                return true;
            });
        }
        this.change(defaultCurrency);
    }
    UiCurrency.prototype.change = function (currency) {
        this.currency = currency;
        this.structure.find(".id_currency").text(currencyLib.data[currency].symbol);
        this.evtChange.post(currency);
    };
    UiCurrency.prototype.interact_getCurrency = function () {
        return __awaiter(this, void 0, void 0, function () {
            var doChange;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new Promise(function (resolve) {
                            return bootbox_custom.dialog({
                                "title": "Currency",
                                "message": "Pay in " + currencyLib.data[_this.currency].name + " ?",
                                "closeButton": false,
                                "buttons": [
                                    {
                                        "label": "Yes, pay in " + currencyLib.data[_this.currency].symbol,
                                        "className": "btn-success",
                                        "callback": function () { return resolve(false); }
                                    },
                                    {
                                        "label": "No, pay with an other currency",
                                        "className": 'btn-warning',
                                        "callback": function () { return resolve(true); }
                                    },
                                ]
                            });
                        })];
                    case 1:
                        doChange = _a.sent();
                        if (!doChange) {
                            return [2 /*return*/, this.currency];
                        }
                        this.structure.one("shown.bs.dropdown", function () { return _this.structure.find("select")["select2"]("open"); });
                        this.structure.find("a").trigger("click");
                        return [4 /*yield*/, new Promise(function (resolve) {
                                return _this.structure.one("hide.bs.dropdown", function () { return resolve(); });
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, this.currency];
                }
            });
        });
    };
    return UiCurrency;
}());
exports.UiCurrency = UiCurrency;

},{"../../../shared/dist/lib/loadUiClassHtml":31,"../../../shared/dist/tools/bootbox_custom":36,"../../../shared/dist/tools/currency":37,"../templates/UiCurrency.html":20,"../templates/UiCurrency.less":21,"ts-events-extended":16}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var loadUiClassHtml_1 = require("../../../shared/dist/lib/loadUiClassHtml");
var ts_events_extended_1 = require("ts-events-extended");
var types = require("../../../shared/dist/lib/types/shop");
var currency_1 = require("../../../shared/dist/tools/currency");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiProduct.html"), "UiProduct");
require("../templates/UiProduct.less");
var UiProduct = /** @class */ (function () {
    function UiProduct(product, currency) {
        var _this = this;
        this.product = product;
        this.structure = html.structure.clone();
        this.evtUserClickAddToCart = new ts_events_extended_1.VoidSyncEvent();
        {
            var carouselId_1 = "carousel-" + UiProduct.getCounter();
            var $divCarousel = this.structure.find(".carousel");
            $divCarousel.attr("id", carouselId_1);
            var _loop_1 = function (i) {
                $divCarousel.find(".carousel-indicators").append(function () {
                    var $li = html.templates.find("li").clone();
                    $li.attr("data-target", carouselId_1);
                    $li.attr("data-slide-to", "" + i);
                    if (i === 0) {
                        $li.addClass("active");
                    }
                    return $li;
                });
                $divCarousel.find(".carousel-inner").append(function () {
                    var $div = html.templates.find(".item").clone();
                    if (i === 0) {
                        $div.addClass("active");
                    }
                    $div.find("img").attr("src", product.imageUrls[i]);
                    return $div;
                });
            };
            for (var i = 0; i < product.imageUrls.length; i++) {
                _loop_1(i);
            }
            {
                var $divs = $divCarousel.find(".carousel-control");
                $divs.attr("href", "#" + carouselId_1);
                if (product.imageUrls.length === 1) {
                    $divs.hide();
                }
            }
            $divCarousel.carousel({ "interval": 0 });
        }
        this.structure.find(".id_short_description").text(product.shortDescription);
        this.structure.find(".id_product_name").text(product.name);
        this.structure.find(".id_product_description").text(product.description);
        this.structure.find(".id_add_to_cart")
            .on("click", function () { return _this.evtUserClickAddToCart.post(); });
        this.updateCurrency(currency);
    }
    UiProduct.prototype.updateCurrency = function (currency) {
        this.currency = currency;
        this.updatePrice();
    };
    UiProduct.prototype.updatePrice = function () {
        this.structure.find(".id_product_price").text(types.Price.prettyPrint(this.product.price, this.currency, currency_1.convertFromEuro));
    };
    UiProduct.getCounter = (function () {
        var counter = 0;
        return function () { return counter++; };
    })();
    return UiProduct;
}());
exports.UiProduct = UiProduct;

},{"../../../shared/dist/lib/loadUiClassHtml":31,"../../../shared/dist/lib/types/shop":34,"../../../shared/dist/tools/currency":37,"../templates/UiProduct.html":22,"../templates/UiProduct.less":23,"ts-events-extended":16}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var loadUiClassHtml_1 = require("../../../shared/dist/lib/loadUiClassHtml");
var ts_events_extended_1 = require("ts-events-extended");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiShipTo.html"), "UiShipTo");
require("../templates/UiShipTo.less");
var UiShipTo = /** @class */ (function () {
    function UiShipTo(shipToCountryIso) {
        var _this = this;
        this.structure = html.structure.clone();
        this.evtChange = new ts_events_extended_1.SyncEvent();
        //NOTE: Safe to access, set at creation.
        this.shipToCountryIso = "";
        this.structure.one("show.bs.dropdown", function () {
            return (new window["NiceCountryInput"]($countrySelector)).init();
        });
        var $countrySelector = this.structure.find(".id_countrySelector");
        var cbName = "UiShipTo_onChangeCallback_" + UiShipTo.getCounter();
        $countrySelector
            .attr("data-selectedcountry", shipToCountryIso.toUpperCase())
            .attr("data-onchangecallback", cbName);
        window[cbName] = function (iso) {
            //NOTE: To close the dropdown
            $("body").trigger("click");
            _this.change(iso.toLowerCase());
            _this.evtChange.post(_this.shipToCountryIso);
        };
        this.change(shipToCountryIso);
        //NOTE: Prevent dropdown from closing when select country is clicked.
        this.structure.find(".dropdown-menu").on("click", function () { return false; });
    }
    UiShipTo.prototype.change = function (shipToCountryIso) {
        var $divFlag = this.structure.find(".id_flag");
        if (this.shipToCountryIso !== "") {
            $divFlag.removeClass(this.shipToCountryIso);
        }
        this.shipToCountryIso = shipToCountryIso;
        $divFlag.addClass(this.shipToCountryIso);
    };
    UiShipTo.getCounter = function () {
        var counter = 0;
        return function () { return counter++; };
    };
    return UiShipTo;
}());
exports.UiShipTo = UiShipTo;

},{"../../../shared/dist/lib/loadUiClassHtml":31,"../templates/UiShipTo.html":24,"../templates/UiShipTo.less":25,"ts-events-extended":16}],6:[function(require,module,exports){
"use strict";
//NOTE: assert maps.googleapis.com/maps/api/js?libraries=places loaded ( or loading ) on the page.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var ts_events_extended_1 = require("ts-events-extended");
var loadUiClassHtml_1 = require("../../../shared/dist/lib/loadUiClassHtml");
var modal_stack = require("../../../shared/dist/tools/modal_stack");
var html = loadUiClassHtml_1.loadUiClassHtml(require("../templates/UiShippingForm.html"), "UiShippingForm");
require("../templates/UiShippingForm.less");
var UiShippingForm = /** @class */ (function () {
    /**
     * The evt argument should post be posted whenever.
     * -An user accept a sharing request.
     * -An user reject a sharing request.
     * -An user unregistered a shared sim.
     */
    function UiShippingForm() {
        var _this = this;
        this.structure = html.structure.clone();
        this.evt_id_close_click = new ts_events_extended_1.VoidSyncEvent();
        this.evt_button_click = new ts_events_extended_1.VoidSyncEvent();
        this.autocomplete = undefined;
        var _a = modal_stack.add(this.structure, {
            "keyboard": false,
            "backdrop": true
        }), hide = _a.hide, show = _a.show;
        this.hideModal = hide;
        this.showModal = show;
        this.structure.find(".id_close")
            .on("click", function () { return _this.evt_id_close_click.post(); });
        this.structure.find("button")
            .on("click", function () { return _this.evt_button_click.post(); });
        var _loop_1 = function (selector) {
            var $input = this_1.structure.find(selector);
            $input.on("keypress", function () {
                return $input.removeClass("field-error");
            });
        };
        var this_1 = this;
        for (var _i = 0, _b = [
            ".id_firstName",
            ".id_lastName",
            ".id_placeAutocomplete",
            ".id_extra"
        ]; _i < _b.length; _i++) {
            var selector = _b[_i];
            _loop_1(selector);
        }
    }
    UiShippingForm.prototype.initAutocomplete = function () {
        return __awaiter(this, void 0, void 0, function () {
            var isGoogleMapScriptReady;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        isGoogleMapScriptReady = function () {
                            if (typeof google === "undefined") {
                                return false;
                            }
                            try {
                                google.maps.places.Autocomplete;
                            }
                            catch (_a) {
                                return false;
                            }
                            return true;
                        };
                        _a.label = 1;
                    case 1:
                        if (!!isGoogleMapScriptReady()) return [3 /*break*/, 3];
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 200); })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        this.autocomplete = new google.maps.places.Autocomplete(this.structure.find(".id_placeAutocomplete").get(0), { "types": ["geocode"] });
                        this.autocomplete.setFields(["address_component"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    UiShippingForm.prototype.interact_getAddress = function () {
        return __awaiter(this, void 0, void 0, function () {
            var resolvePrOut, prOut;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        prOut = new Promise(function (resolve) { return resolvePrOut = resolve; });
                        this.evt_id_close_click.detach();
                        this.evt_button_click.detach();
                        this.evt_id_close_click.attach(function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.hideModal()];
                                    case 1:
                                        _a.sent();
                                        resolvePrOut(undefined);
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        this.evt_button_click.attach(function () { return __awaiter(_this, void 0, void 0, function () {
                            var isFormValidated, _i, _a, selector, $input, isValid;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        {
                                            isFormValidated = true;
                                            for (_i = 0, _a = [
                                                ".id_firstName",
                                                ".id_lastName",
                                                ".id_placeAutocomplete"
                                            ]; _i < _a.length; _i++) {
                                                selector = _a[_i];
                                                $input = this.structure.find(selector);
                                                isValid = !!$input.val();
                                                if (selector === ".id_placeAutocomplete") {
                                                    isValid = isValid && !!this.autocomplete.getPlace();
                                                }
                                                if (!isValid) {
                                                    $input.addClass("field-error");
                                                    isFormValidated = false;
                                                }
                                            }
                                            if (!isFormValidated) {
                                                return [2 /*return*/];
                                            }
                                        }
                                        return [4 /*yield*/, this.hideModal()];
                                    case 1:
                                        _b.sent();
                                        resolvePrOut({
                                            "firstName": this.structure.find(".id_firstName").val(),
                                            "lastName": this.structure.find(".id_lastName").val(),
                                            "addressComponents": this.autocomplete.getPlace()["address_components"],
                                            "addressExtra": this.structure.find(".id_extra").val() || undefined
                                        });
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        this.evt_id_close_click.attachOnce(function () { return resolvePrOut(undefined); });
                        return [4 /*yield*/, this.showModal()];
                    case 1:
                        _a.sent();
                        if (!(this.autocomplete === undefined)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.initAutocomplete()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, prOut];
                }
            });
        });
    };
    return UiShippingForm;
}());
exports.UiShippingForm = UiShippingForm;

},{"../../../shared/dist/lib/loadUiClassHtml":31,"../../../shared/dist/tools/modal_stack":38,"../templates/UiShippingForm.html":26,"../templates/UiShippingForm.less":27,"ts-events-extended":16}],7:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var webApiCaller = require("../../../shared/dist/lib/webApiCaller");
var UiController_1 = require("./UiController");
var currency_1 = require("../../../shared/dist/tools/currency");
var availablePages = require("../../../shared/dist/lib/availablePages");
$(document).ready(function () { return __awaiter(_this, void 0, void 0, function () {
    var _a, changesRates, _b, countryIsoFromLocation, countryIsoForLanguage, uiController;
    var _this = this;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                $("#logout").click(function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, webApiCaller.logoutUser()];
                            case 1:
                                _a.sent();
                                location.href = "/" + availablePages.PageName.login;
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [4 /*yield*/, Promise.all([
                        webApiCaller.getChangesRates(),
                        webApiCaller.getCountryIso()
                    ])];
            case 1:
                _a = _c.sent(), changesRates = _a[0], _b = _a[1], countryIsoFromLocation = _b.location, countryIsoForLanguage = _b.language;
                currency_1.convertFromEuro.setChangeRates(changesRates);
                console.log({ countryIsoForLanguage: countryIsoForLanguage, countryIsoFromLocation: countryIsoFromLocation });
                uiController = new UiController_1.UiController(countryIsoFromLocation || countryIsoForLanguage);
                $("#page-payload").html("").append(uiController.structure);
                return [2 /*return*/];
        }
    });
}); });

},{"../../../shared/dist/lib/availablePages":29,"../../../shared/dist/lib/webApiCaller":35,"../../../shared/dist/tools/currency":37,"./UiController":2}],8:[function(require,module,exports){
module.exports = function (css, customDocument) {
  var doc = customDocument || document;
  if (doc.createStyleSheet) {
    var sheet = doc.createStyleSheet()
    sheet.cssText = css;
    return sheet.ownerNode;
  } else {
    var head = doc.getElementsByTagName('head')[0],
        style = doc.createElement('style');

    style.type = 'text/css';

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(doc.createTextNode(css));
    }

    head.appendChild(style);
    return style;
  }
};

module.exports.byUrl = function(url) {
  if (document.createStyleSheet) {
    return document.createStyleSheet(url).ownerNode;
  } else {
    var head = document.getElementsByTagName('head')[0],
        link = document.createElement('link');

    link.rel = 'stylesheet';
    link.href = url;

    head.appendChild(link);
    return link;
  }
};

},{}],9:[function(require,module,exports){
module.exports = require('cssify');

},{"cssify":8}],10:[function(require,module,exports){
"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
exports.__esModule = true;
var ExecQueue = /** @class */ (function () {
    function ExecQueue() {
        this.queuedCalls = [];
        this.isRunning = false;
        this.prComplete = Promise.resolve();
    }
    //TODO: move where it is used.
    ExecQueue.prototype.cancelAllQueuedCalls = function () {
        var n;
        this.queuedCalls.splice(0, n = this.queuedCalls.length);
        return n;
    };
    return ExecQueue;
}());
var globalContext = {};
var clusters = new WeakMap();
//console.log("Map version");
//export const clusters = new Map<Object, Map<GroupRef,ExecQueue>>();
function getOrCreateExecQueue(context, groupRef) {
    var execQueueByGroup = clusters.get(context);
    if (!execQueueByGroup) {
        execQueueByGroup = new WeakMap();
        clusters.set(context, execQueueByGroup);
    }
    var execQueue = execQueueByGroup.get(groupRef);
    if (!execQueue) {
        execQueue = new ExecQueue();
        execQueueByGroup.set(groupRef, execQueue);
    }
    return execQueue;
}
function createGroupRef() {
    return new Array(0);
}
exports.createGroupRef = createGroupRef;
function build() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    switch (inputs.length) {
        case 1: return buildFnPromise(true, createGroupRef(), inputs[0]);
        case 2: return buildFnPromise(true, inputs[0], inputs[1]);
    }
}
exports.build = build;
function buildMethod() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    switch (inputs.length) {
        case 1: return buildFnPromise(false, createGroupRef(), inputs[0]);
        case 2: return buildFnPromise(false, inputs[0], inputs[1]);
    }
}
exports.buildMethod = buildMethod;
/**
 *
 * Get the number of queued call of a run-exclusive function.
 * Note that if you call a runExclusive function and call this
 * directly after it will return 0 as there is one function call
 * running but 0 queued.
 *
 * The classInstanceObject parameter is to provide only for the run-exclusive
 * function created with 'buildMethod[Cb].
 *
 * */
function getQueuedCallCount(runExclusiveFunction, classInstanceObject) {
    var execQueue = getExecQueueByFunctionAndContext(runExclusiveFunction, classInstanceObject);
    return execQueue ? execQueue.queuedCalls.length : 0;
}
exports.getQueuedCallCount = getQueuedCallCount;
/**
 *
 * Cancel all queued calls of a run-exclusive function.
 * Note that the current running call will not be cancelled.
 *
 * The classInstanceObject parameter is to provide only for the run-exclusive
 * function created with 'buildMethod[Cb].
 *
 */
function cancelAllQueuedCalls(runExclusiveFunction, classInstanceObject) {
    var execQueue = getExecQueueByFunctionAndContext(runExclusiveFunction, classInstanceObject);
    return execQueue ? execQueue.cancelAllQueuedCalls() : 0;
}
exports.cancelAllQueuedCalls = cancelAllQueuedCalls;
/**
 * Tell if a run-exclusive function has an instance of it's call currently being
 * performed.
 *
 * The classInstanceObject parameter is to provide only for the run-exclusive
 * function created with 'buildMethod[Cb].
 */
function isRunning(runExclusiveFunction, classInstanceObject) {
    var execQueue = getExecQueueByFunctionAndContext(runExclusiveFunction, classInstanceObject);
    return execQueue ? execQueue.isRunning : false;
}
exports.isRunning = isRunning;
/**
 * Return a promise that resolve when all the current queued call of a runExclusive functions
 * have completed.
 *
 * The classInstanceObject parameter is to provide only for the run-exclusive
 * function created with 'buildMethod[Cb].
 */
function getPrComplete(runExclusiveFunction, classInstanceObject) {
    var execQueue = getExecQueueByFunctionAndContext(runExclusiveFunction, classInstanceObject);
    return execQueue ? execQueue.prComplete : Promise.resolve();
}
exports.getPrComplete = getPrComplete;
var groupByRunExclusiveFunction = new WeakMap();
function getExecQueueByFunctionAndContext(runExclusiveFunction, context) {
    if (context === void 0) { context = globalContext; }
    var groupRef = groupByRunExclusiveFunction.get(runExclusiveFunction);
    if (!groupRef) {
        throw Error("Not a run exclusiveFunction");
    }
    var execQueueByGroup = clusters.get(context);
    if (!execQueueByGroup) {
        return undefined;
    }
    return execQueueByGroup.get(groupRef);
}
function buildFnPromise(isGlobal, groupRef, fun) {
    var execQueue;
    var runExclusiveFunction = (function () {
        var _this = this;
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        if (!isGlobal) {
            if (!(this instanceof Object)) {
                throw new Error("Run exclusive, <this> should be an object");
            }
            execQueue = getOrCreateExecQueue(this, groupRef);
        }
        return new Promise(function (resolve, reject) {
            var onPrCompleteResolve;
            execQueue.prComplete = new Promise(function (resolve) {
                return onPrCompleteResolve = function () { return resolve(); };
            });
            var onComplete = function (result) {
                onPrCompleteResolve();
                execQueue.isRunning = false;
                if (execQueue.queuedCalls.length) {
                    execQueue.queuedCalls.shift()();
                }
                if ("data" in result) {
                    resolve(result.data);
                }
                else {
                    reject(result.reason);
                }
            };
            (function callee() {
                var _this = this;
                var inputs = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    inputs[_i] = arguments[_i];
                }
                if (execQueue.isRunning) {
                    execQueue.queuedCalls.push(function () { return callee.apply(_this, inputs); });
                    return;
                }
                execQueue.isRunning = true;
                try {
                    fun.apply(this, inputs)
                        .then(function (data) { return onComplete({ data: data }); })["catch"](function (reason) { return onComplete({ reason: reason }); });
                }
                catch (error) {
                    onComplete({ "reason": error });
                }
            }).apply(_this, inputs);
        });
    });
    if (isGlobal) {
        execQueue = getOrCreateExecQueue(globalContext, groupRef);
    }
    groupByRunExclusiveFunction.set(runExclusiveFunction, groupRef);
    return runExclusiveFunction;
}
function buildCb() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    switch (inputs.length) {
        case 1: return buildFnCallback(true, createGroupRef(), inputs[0]);
        case 2: return buildFnCallback(true, inputs[0], inputs[1]);
    }
}
exports.buildCb = buildCb;
function buildMethodCb() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    switch (inputs.length) {
        case 1: return buildFnCallback(false, createGroupRef(), inputs[0]);
        case 2: return buildFnCallback(false, inputs[0], inputs[1]);
    }
}
exports.buildMethodCb = buildMethodCb;
function buildFnCallback(isGlobal, groupRef, fun) {
    var execQueue;
    var runExclusiveFunction = (function () {
        var _this = this;
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        if (!isGlobal) {
            if (!(this instanceof Object)) {
                throw new Error("Run exclusive, <this> should be an object");
            }
            execQueue = getOrCreateExecQueue(this, groupRef);
        }
        var callback = undefined;
        if (inputs.length && typeof inputs[inputs.length - 1] === "function") {
            callback = inputs.pop();
        }
        var onPrCompleteResolve;
        execQueue.prComplete = new Promise(function (resolve) {
            return onPrCompleteResolve = function () { return resolve(); };
        });
        var onComplete = function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            onPrCompleteResolve();
            execQueue.isRunning = false;
            if (execQueue.queuedCalls.length) {
                execQueue.queuedCalls.shift()();
            }
            if (callback) {
                callback.apply(_this, inputs);
            }
        };
        onComplete.hasCallback = !!callback;
        (function callee() {
            var _this = this;
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            if (execQueue.isRunning) {
                execQueue.queuedCalls.push(function () { return callee.apply(_this, inputs); });
                return;
            }
            execQueue.isRunning = true;
            try {
                fun.apply(this, __spread(inputs, [onComplete]));
            }
            catch (error) {
                error.message += " ( This exception should not have been thrown, miss use of run-exclusive buildCb )";
                throw error;
            }
        }).apply(this, inputs);
    });
    if (isGlobal) {
        execQueue = getOrCreateExecQueue(globalContext, groupRef);
    }
    groupByRunExclusiveFunction.set(runExclusiveFunction, groupRef);
    return runExclusiveFunction;
}

},{}],11:[function(require,module,exports){
'use strict'
/* eslint no-proto: 0 */
module.exports = Object.setPrototypeOf || ({ __proto__: [] } instanceof Array ? setProtoOf : mixinProperties)

function setProtoOf (obj, proto) {
  obj.__proto__ = proto
  return obj
}

function mixinProperties (obj, proto) {
  for (var prop in proto) {
    if (!obj.hasOwnProperty(prop)) {
      obj[prop] = proto[prop]
    }
  }
  return obj
}

},{}],12:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var SyncEventBase_1 = require("./SyncEventBase");
var SyncEvent = /** @class */ (function (_super) {
    __extends(SyncEvent, _super);
    function SyncEvent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.evtAttach = new SyncEventBase_1.SyncEventBase();
        return _this;
    }
    SyncEvent.prototype.addHandler = function (attachParams, implicitAttachParams) {
        var handler = _super.prototype.addHandler.call(this, attachParams, implicitAttachParams);
        this.evtAttach.post(handler);
        return handler;
    };
    return SyncEvent;
}(SyncEventBase_1.SyncEventBase));
exports.SyncEvent = SyncEvent;
var VoidSyncEvent = /** @class */ (function (_super) {
    __extends(VoidSyncEvent, _super);
    function VoidSyncEvent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    VoidSyncEvent.prototype.post = function () {
        return _super.prototype.post.call(this, undefined);
    };
    return VoidSyncEvent;
}(SyncEvent));
exports.VoidSyncEvent = VoidSyncEvent;

},{"./SyncEventBase":13}],13:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
exports.__esModule = true;
var SyncEventBaseProtected_1 = require("./SyncEventBaseProtected");
function matchPostable(o) {
    return o instanceof Object && typeof o.post === "function";
}
function isCallable(o) {
    if (typeof o !== "function")
        return false;
    var prototype = o["prototype"];
    if (!prototype)
        return true;
    var methods = Object.getOwnPropertyNames(prototype);
    if (methods.length !== 1)
        return false;
    var name = o.name;
    if (!name)
        return true;
    if (name[0].toUpperCase() === name[0])
        return false;
    return true;
}
/** SyncEvent without evtAttach property */
var SyncEventBase = /** @class */ (function (_super) {
    __extends(SyncEventBase, _super);
    function SyncEventBase() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.defaultParams = {
            "matcher": function matchAll() { return true; },
            "boundTo": _this,
            "timeout": undefined,
            "callback": undefined
        };
        return _this;
    }
    SyncEventBase.prototype.getDefaultParams = function () {
        return __assign({}, this.defaultParams);
    };
    SyncEventBase.prototype.readParams = function (inputs) {
        var out = this.getDefaultParams();
        var n = inputs.length;
        if (!n)
            return out;
        //[ matcher, boundTo, timeout, callback ]
        //[ matcher, boundTo, callback ]
        //[ matcher, timeout, callback ]
        //[ boundTo, timeout, callback ]
        //[ matcher, callback ]
        //[ boundTo, callback ]
        //[ timeout, callback ]
        //[ callback ]
        //[ matcher, timeout, evt ]
        //[ matcher, evt ]
        //[ timeout, evt ]
        //[ evt ]
        if (matchPostable(inputs[n - 1])) {
            out.boundTo = inputs[n - 1];
            inputs[n - 1] = inputs[n - 1].post;
        }
        //[ matcher, boundTo, timeout, callback ]
        //[ matcher, boundTo, callback ]
        //[ matcher, timeout, callback ]
        //[ boundTo, timeout, callback ]
        //[ matcher, callback ]
        //[ boundTo, callback ]
        //[ timeout, callback ]
        //[ callback ]
        if (n === 4) {
            //[ matcher, boundTo, timeout, callback ]
            var p1 = inputs[0], p2 = inputs[1], p3 = inputs[2], p4 = inputs[3];
            out.matcher = p1;
            out.boundTo = p2;
            out.timeout = p3;
            out.callback = p4;
        }
        else if (n === 3) {
            //[ matcher, boundTo, callback ]
            //[ matcher, timeout, callback ]
            //[ boundTo, timeout, callback ]
            var p1 = inputs[0], p2 = inputs[1], p3 = inputs[2];
            if (typeof p2 === "number") {
                //[ matcher, timeout, callback ]
                //[ boundTo, timeout, callback ]
                out.timeout = p2;
                out.callback = p3;
                if (isCallable(p1)) {
                    //[ matcher, timeout, callback ]
                    out.matcher = p1;
                }
                else {
                    //[ boundTo, timeout, callback ]
                    out.boundTo = p1;
                }
            }
            else {
                //[ matcher, boundTo, callback ]
                out.matcher = p1;
                out.boundTo = p2;
                out.callback = p3;
            }
        }
        else if (n === 2) {
            //[ matcher, callback ]
            //[ boundTo, callback ]
            //[ timeout, callback ]
            var p1 = inputs[0], p2 = inputs[1];
            if (typeof p1 === "number") {
                //[ timeout, callback ]
                out.timeout = p1;
                out.callback = p2;
            }
            else {
                //[ matcher, callback ]
                //[ boundTo, callback ]
                out.callback = p2;
                if (isCallable(p1)) {
                    out.matcher = p1;
                }
                else {
                    out.boundTo = p1;
                }
            }
        }
        else if (n === 1) {
            //[ callback ]
            var p = inputs[0];
            out.callback = p;
        }
        return out;
    };
    SyncEventBase.prototype.waitFor = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        var params = this.getDefaultParams();
        var n = inputs.length;
        if (n === 2) {
            var p1 = inputs[0], p2 = inputs[1];
            params.matcher = p1;
            params.timeout = p2;
        }
        else {
            var p = inputs[0];
            if (isCallable(p)) {
                params.matcher = p;
            }
            else {
                params.timeout = p;
            }
        }
        return _super.prototype.__waitFor.call(this, params);
    };
    SyncEventBase.prototype.attach = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.__attach(this.readParams(inputs));
    };
    SyncEventBase.prototype.attachOnce = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.__attachOnce(this.readParams(inputs));
    };
    SyncEventBase.prototype.attachExtract = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.__attachExtract(this.readParams(inputs));
    };
    SyncEventBase.prototype.attachPrepend = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.__attachPrepend(this.readParams(inputs));
    };
    SyncEventBase.prototype.attachOncePrepend = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.__attachOncePrepend(this.readParams(inputs));
    };
    SyncEventBase.prototype.attachOnceExtract = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return this.__attachOnceExtract(this.readParams(inputs));
    };
    return SyncEventBase;
}(SyncEventBaseProtected_1.SyncEventBaseProtected));
exports.SyncEventBase = SyncEventBase;

},{"./SyncEventBaseProtected":14}],14:[function(require,module,exports){
"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
exports.__esModule = true;
var runExclusive = require("run-exclusive");
var defs_1 = require("./defs");
/** SyncEvent without evtAttach property and without overload */
var SyncEventBaseProtected = /** @class */ (function () {
    function SyncEventBaseProtected() {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        var _this = this;
        this.tick = 0;
        this.postCount = 0;
        this.traceId = null;
        this.handlers = [];
        this.handlerTriggers = new Map();
        this.postAsync = runExclusive.buildCb(function (data, postTick, releaseLock) {
            var isHandled = false;
            for (var _i = 0, _a = _this.handlers.slice(); _i < _a.length; _i++) {
                var handler = _a[_i];
                var async = handler.async, matcher = handler.matcher;
                if (!async || !matcher(data))
                    continue;
                var handlerTrigger = _this.handlerTriggers.get(handler);
                if (!handlerTrigger)
                    continue;
                if (handlerTrigger.handlerTick > postTick)
                    continue;
                isHandled = true;
                handlerTrigger.trigger(data);
            }
            if (!isHandled) {
                releaseLock();
            }
            else {
                var handlersDump_1 = _this.handlers.slice();
                setTimeout(function () {
                    for (var _i = 0, _a = _this.handlers; _i < _a.length; _i++) {
                        var handler = _a[_i];
                        var async = handler.async;
                        if (!async)
                            continue;
                        if (handlersDump_1.indexOf(handler) >= 0)
                            continue;
                        _this.handlerTriggers.get(handler).handlerTick = postTick;
                    }
                    releaseLock();
                }, 0);
            }
        });
        if (!inputs.length)
            return;
        var eventEmitter = inputs[0], eventName = inputs[1];
        var formatter = inputs[2] || this.defaultFormatter;
        eventEmitter.on(eventName, function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.post(formatter.apply(null, inputs));
        });
    }
    SyncEventBaseProtected.prototype.defaultFormatter = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        return inputs[0];
    };
    SyncEventBaseProtected.prototype.enableTrace = function (id, formatter, log) {
        this.traceId = id;
        if (!!formatter) {
            this.traceFormatter = formatter;
        }
        else {
            this.traceFormatter = function (data) {
                try {
                    return JSON.stringify(data, null, 2);
                }
                catch (_a) {
                    return "" + data;
                }
            };
        }
        if (!!log) {
            this.log = log;
        }
        else {
            this.log = function () {
                var inputs = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    inputs[_i] = arguments[_i];
                }
                return console.log.apply(console, inputs);
            };
        }
    };
    SyncEventBaseProtected.prototype.disableTrace = function () {
        this.traceId = null;
    };
    SyncEventBaseProtected.prototype.addHandler = function (attachParams, implicitAttachParams) {
        var _this = this;
        var handler = __assign({}, attachParams, implicitAttachParams, { "detach": null, "promise": null });
        handler.promise = new Promise(function (resolve, reject) {
            var timer = undefined;
            if (typeof handler.timeout === "number") {
                timer = setTimeout(function () {
                    timer = undefined;
                    handler.detach();
                    reject(new defs_1.EvtError.Timeout(handler.timeout));
                }, handler.timeout);
            }
            handler.detach = function () {
                var index = _this.handlers.indexOf(handler);
                if (index < 0)
                    return false;
                _this.handlers.splice(index, 1);
                _this.handlerTriggers["delete"](handler);
                if (timer) {
                    clearTimeout(timer);
                    reject(new defs_1.EvtError.Detached());
                }
                return true;
            };
            var handlerTick = _this.tick++;
            var trigger = function (data) {
                var callback = handler.callback, once = handler.once;
                if (timer) {
                    clearTimeout(timer);
                    timer = undefined;
                }
                if (once)
                    handler.detach();
                if (callback)
                    callback.call(handler.boundTo, data);
                resolve(data);
            };
            _this.handlerTriggers.set(handler, { handlerTick: handlerTick, trigger: trigger });
        });
        if (handler.prepend) {
            var i = void 0;
            for (i = 0; i < this.handlers.length; i++) {
                if (this.handlers[i].extract)
                    continue;
                else
                    break;
            }
            this.handlers.splice(i, 0, handler);
        }
        else {
            this.handlers.push(handler);
        }
        return handler;
    };
    SyncEventBaseProtected.prototype.trace = function (data) {
        if (this.traceId === null) {
            return;
        }
        var message = "(" + this.traceId + ") ";
        var isExtracted = !!this.handlers.find(function (_a) {
            var extract = _a.extract, matcher = _a.matcher;
            return extract && matcher(data);
        });
        if (isExtracted) {
            message += "extracted ";
        }
        else {
            var handlerCount = this.handlers
                .filter(function (_a) {
                var extract = _a.extract, matcher = _a.matcher;
                return !extract && matcher(data);
            })
                .length;
            message += handlerCount + " handler" + ((handlerCount > 1) ? "s" : "") + " => ";
        }
        this.log(message + this.traceFormatter(data));
    };
    SyncEventBaseProtected.prototype.post = function (data) {
        this.trace(data);
        this.postCount++;
        var postTick = this.tick++;
        var isExtracted = this.postSync(data);
        if (!isExtracted) {
            this.postAsync(data, postTick);
        }
        return this.postCount;
    };
    SyncEventBaseProtected.prototype.postSync = function (data) {
        for (var _i = 0, _a = this.handlers.slice(); _i < _a.length; _i++) {
            var handler = _a[_i];
            var async = handler.async, matcher = handler.matcher, extract = handler.extract;
            if (async || !matcher(data))
                continue;
            var handlerTrigger = this.handlerTriggers.get(handler);
            if (!handlerTrigger)
                continue;
            handlerTrigger.trigger(data);
            if (extract)
                return true;
        }
        return false;
    };
    SyncEventBaseProtected.prototype.__waitFor = function (attachParams) {
        return this.addHandler(attachParams, {
            "async": true,
            "extract": false,
            "once": true,
            "prepend": false
        }).promise;
    };
    SyncEventBaseProtected.prototype.__attach = function (attachParams) {
        return this.addHandler(attachParams, {
            "async": false,
            "extract": false,
            "once": false,
            "prepend": false
        }).promise;
    };
    SyncEventBaseProtected.prototype.__attachExtract = function (attachParams) {
        return this.addHandler(attachParams, {
            "async": false,
            "extract": true,
            "once": false,
            "prepend": true
        }).promise;
    };
    SyncEventBaseProtected.prototype.__attachPrepend = function (attachParams) {
        return this.addHandler(attachParams, {
            "async": false,
            "extract": false,
            "once": false,
            "prepend": true
        }).promise;
    };
    SyncEventBaseProtected.prototype.__attachOnce = function (attachParams) {
        return this.addHandler(attachParams, {
            "async": false,
            "extract": false,
            "once": true,
            "prepend": false
        }).promise;
    };
    SyncEventBaseProtected.prototype.__attachOncePrepend = function (attachParams) {
        return this.addHandler(attachParams, {
            "async": false,
            "extract": false,
            "once": true,
            "prepend": true
        }).promise;
    };
    SyncEventBaseProtected.prototype.__attachOnceExtract = function (attachParams) {
        return this.addHandler(attachParams, {
            "async": false,
            "extract": true,
            "once": true,
            "prepend": true
        }).promise;
    };
    SyncEventBaseProtected.prototype.getHandlers = function () { return this.handlers.slice(); };
    /** Detach every handler bound to a given object or all handlers, return the detached handlers */
    SyncEventBaseProtected.prototype.detach = function (boundTo) {
        var detachedHandlers = [];
        for (var _i = 0, _a = this.handlers.slice(); _i < _a.length; _i++) {
            var handler = _a[_i];
            if (boundTo === undefined || handler.boundTo === boundTo) {
                handler.detach();
                detachedHandlers.push(handler);
            }
        }
        return detachedHandlers;
    };
    return SyncEventBaseProtected;
}());
exports.SyncEventBaseProtected = SyncEventBaseProtected;

},{"./defs":15,"run-exclusive":10}],15:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var setPrototypeOf = require("setprototypeof");
var EvtError;
(function (EvtError) {
    var Timeout = /** @class */ (function (_super) {
        __extends(Timeout, _super);
        function Timeout(timeout) {
            var _newTarget = this.constructor;
            var _this = _super.call(this, "Evt timeout after " + timeout + "ms") || this;
            _this.timeout = timeout;
            setPrototypeOf(_this, _newTarget.prototype);
            return _this;
        }
        return Timeout;
    }(Error));
    EvtError.Timeout = Timeout;
    var Detached = /** @class */ (function (_super) {
        __extends(Detached, _super);
        function Detached() {
            var _newTarget = this.constructor;
            var _this = _super.call(this, "Evt handler detached") || this;
            setPrototypeOf(_this, _newTarget.prototype);
            return _this;
        }
        return Detached;
    }(Error));
    EvtError.Detached = Detached;
})(EvtError = exports.EvtError || (exports.EvtError = {}));

},{"setprototypeof":11}],16:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var SyncEvent_1 = require("./SyncEvent");
exports.SyncEvent = SyncEvent_1.SyncEvent;
exports.VoidSyncEvent = SyncEvent_1.VoidSyncEvent;
var defs_1 = require("./defs");
exports.EvtError = defs_1.EvtError;

},{"./SyncEvent":12,"./defs":15}],17:[function(require,module,exports){
module.exports = "\r\n\r\n<!--TODO: col-sm-12 should be externalized -->\r\n<div class=\"id_UiCart panel plain col-sm-12 col-lg-10\">\r\n\r\n    <div class=\"panel-heading\">\r\n        <h4 class=\"panel-title\"><i class=\"glyphicon glyphicon-shopping-cart\"></i> Shopping bag</h4>\r\n    </div>\r\n\r\n    <div class=\"panel-body\">\r\n\r\n      <div class=\"shopping-cart\">\r\n\r\n      </div>\r\n\r\n      <div class=\"pull-right mt15\">\r\n\r\n        <span class=\"id_cart_price\"></span>\r\n        &nbsp;\r\n        <span>+</span>\r\n        &nbsp;\r\n        <span style=\"font-style: italic;\">shipping:</span>\r\n        &nbsp;\r\n        <span class=\"id_shipping_price\"></span>\r\n        &nbsp;\r\n        &nbsp;\r\n        <span style=\"font-weight: bold;\">Total: </span><span class=\"id_cart_total\" ></span>\r\n        &nbsp;\r\n        <button type=\"button\" class=\"id_checkout btn btn-success\">Checkout</button>\r\n\r\n      </div>\r\n\r\n    </div>\r\n\r\n</div>\r\n\r\n<div class=\"templates\">\r\n\r\n  <div class=\"item id_UiCartEntry\">\r\n    <div class=\"buttons\">\r\n      <span class=\"delete-btn\"></span>\r\n    </div>\r\n\r\n    <div class=\"image\">\r\n      <img src=\"\" alt=\"\" />\r\n    </div>\r\n\r\n    <div class=\"description\">\r\n      <span class=\"id_item_name\">Common Projects</span>\r\n      <span class=\"id_short_description\" >White</span>\r\n    </div>\r\n\r\n    <div class=\"quantity\">\r\n      <button class=\"plus-btn\" type=\"button\" name=\"button\">\r\n        <img  alt=\"\" /><!-- src=\"/svg/plus.svg\" -->\r\n      </button>\r\n      <input type=\"text\" name=\"name\" value=\"1\">\r\n      <button class=\"minus-btn\" type=\"button\" name=\"button\">\r\n        <img src=\"\" alt=\"\" /><!-- src=\"/svg/minus.svg\" -->\r\n      </button>\r\n    </div>\r\n\r\n    <div class=\"total-price\">$549</div>\r\n  </div>\r\n\r\n\r\n</div>\r\n\r\n\r\n\r\n";
},{}],18:[function(require,module,exports){
var css = "div.id_UiCart {\n  /* Responsive */\n}\ndiv.id_UiCart .shopping-cart {\n  box-shadow: 1px 2px 3px 0px rgba(0, 0, 0, 0.1);\n  border-radius: 6px;\n  display: flex;\n  flex-direction: column;\n  border-top: 1px solid #E1E8EE;\n  border-left: 1px solid #E1E8EE;\n  border-right: 1px solid #E1E8EE;\n  /* Buttons -  Delete and Like */\n  /* Product Image */\n  /* Product Description */\n  /* Product Quantity */\n  /* Total Price */\n}\ndiv.id_UiCart .shopping-cart .item {\n  padding: 20px 30px;\n  height: 120px;\n  display: flex;\n  border-bottom: 1px solid #E1E8EE;\n}\ndiv.id_UiCart .shopping-cart .buttons {\n  position: relative;\n  padding-top: 30px;\n  margin-right: 60px;\n}\ndiv.id_UiCart .shopping-cart .delete-btn {\n  display: inline-block;\n  cursor: pointer;\n  width: 18px;\n  height: 17px;\n  margin-right: 20px;\n}\ndiv.id_UiCart .shopping-cart .is-active {\n  animation-name: animate;\n  animation-duration: .8s;\n  animation-iteration-count: 1;\n  animation-timing-function: steps(28);\n  animation-fill-mode: forwards;\n}\n@keyframes animate {\n  0% {\n    background-position: left;\n  }\n  50% {\n    background-position: right;\n  }\n  100% {\n    background-position: right;\n  }\n}\ndiv.id_UiCart .shopping-cart .image {\n  margin-right: 50px;\n}\ndiv.id_UiCart .shopping-cart .image img {\n  height: 80px;\n}\ndiv.id_UiCart .shopping-cart .description {\n  padding-top: 10px;\n  margin-right: 60px;\n  width: 115px;\n}\ndiv.id_UiCart .shopping-cart .description span {\n  display: block;\n  font-size: 14px;\n  color: #43484D;\n  font-weight: 400;\n}\ndiv.id_UiCart .shopping-cart .description span.id_item_name {\n  margin-bottom: 5px;\n}\ndiv.id_UiCart .shopping-cart .description span.id_short_description {\n  font-weight: 300;\n  margin-top: 8px;\n  color: #86939E;\n}\ndiv.id_UiCart .shopping-cart .quantity {\n  padding-top: 20px;\n  margin-right: 60px;\n}\ndiv.id_UiCart .shopping-cart .quantity input {\n  -webkit-appearance: none;\n  border: none;\n  text-align: center;\n  width: 32px;\n  font-size: 16px;\n  color: #43484D;\n  font-weight: 300;\n}\ndiv.id_UiCart .shopping-cart button[class*=btn] {\n  width: 30px;\n  height: 30px;\n  background-color: #E1E8EE;\n  border-radius: 6px;\n  border: none;\n  cursor: pointer;\n}\ndiv.id_UiCart .shopping-cart .minus-btn img {\n  margin-bottom: 3px;\n}\ndiv.id_UiCart .shopping-cart .plus-btn img {\n  margin-top: 2px;\n}\ndiv.id_UiCart .shopping-cart button:focus,\ndiv.id_UiCart .shopping-cart input:focus {\n  outline: 0;\n}\ndiv.id_UiCart .shopping-cart .total-price {\n  width: 83px;\n  padding-top: 27px;\n  text-align: center;\n  font-size: 16px;\n  color: #43484D;\n  font-weight: 300;\n}\n@media (max-width: 800px) {\n  div.id_UiCart .shopping-cart {\n    width: 100%;\n    height: auto;\n    overflow: hidden;\n  }\n  div.id_UiCart .shopping-cart .item {\n    height: auto;\n    flex-wrap: wrap;\n    justify-content: center;\n  }\n  div.id_UiCart .shopping-cart .image,\n  div.id_UiCart .shopping-cart .quantity,\n  div.id_UiCart .shopping-cart .description {\n    width: 100%;\n    text-align: center;\n    margin: 6px 0;\n  }\n  div.id_UiCart .shopping-cart .buttons {\n    margin-right: 20px;\n  }\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":9}],19:[function(require,module,exports){
module.exports = "<div class=\"id_UiController\">\r\n\r\n    <div class=\"row id_container pt5\">\r\n\r\n    </div>\r\n\r\n</div>";
},{}],20:[function(require,module,exports){
module.exports = "<li class=\"id_UiCurrency dropdown\">\r\n\r\n  <a href=\"#\" data-toggle=\"dropdown\" aria-expanded=\"false\">\r\n    <span class=\"id_currency\"></span>\r\n  </a>\r\n\r\n  <div class=\"dropdown-menu dropdown-form dynamic-settings right animated fadeIn\" role=\"menu\">\r\n\r\n    <select>\r\n    </select>\r\n\r\n  </div>\r\n\r\n</li>\r\n\r\n\r\n<div class=\"templates\">\r\n\r\n  <option></option>\r\n\r\n</div>";
},{}],21:[function(require,module,exports){
var css = ".id_UiCurrency {\n  /*@media all and (max-width: 767px) {*/\n}\n@media all and (max-width: 768px) {\n  .id_UiCurrency {\n    top: -21px;\n  }\n}\n.id_UiCurrency select {\n  width: 200px;\n}\n.id_UiCurrency .dropdown-menu.dynamic-settings {\n  min-width: unset !important;\n}\n.id_UiCurrency .dropdown-menu {\n  border-bottom-width: 0px;\n  border-left-width: 0px;\n  border-right-width: 0px;\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":9}],22:[function(require,module,exports){
module.exports = "<!--TODO: col-sm-12 should be externalized -->\r\n<div class=\"id_UiProduct panel plain col-sm-12 col-lg-10\">\r\n\r\n    <div class=\"panel-body\">\r\n\r\n        <div class=\"left-column\">\r\n\r\n            <div class=\"carousel slide\">\r\n                <ol class=\"carousel-indicators dotstyle center\">\r\n                </ol>\r\n                <div class=\"carousel-inner\">\r\n                </div>\r\n                <a class=\"left carousel-control\" data-slide=\"prev\">\r\n                    <i class=\"fa fa-angle-left\"></i>\r\n                </a>\r\n                <a class=\"right carousel-control\" data-slide=\"next\">\r\n                    <i class=\"fa fa-angle-right\"></i>\r\n                </a>\r\n            </div>\r\n\r\n\r\n\r\n        </div>\r\n\r\n        <div class=\"right-column\">\r\n\r\n            <div class=\"product-description\">\r\n                <span class=\"id_short_description\"></span>\r\n                <h1 class=\"id_product_name\"></h1>\r\n                <p class=\"id_product_description\"></p>\r\n            </div>\r\n\r\n            <div class=\"product-price\">\r\n                <span class=\"id_product_price\"></span>\r\n            </div>\r\n\r\n            <div class=\"pull-right mt10\">\r\n                <button type=\"button\" class=\"id_add_to_cart btn btn-success\">Add to cart</button>\r\n            </div>\r\n\r\n        </div>\r\n\r\n    </div>\r\n\r\n</div>\r\n\r\n<div class=\"templates\">\r\n\r\n    <div class=\"item\">\r\n        <img src=\"\">\r\n    </div>\r\n\r\n    <li>\r\n        <a href=\"#\"></a>\r\n    </li>\r\n\r\n</div>";
},{}],23:[function(require,module,exports){
var css = "div.id_UiProduct .panel-body {\n  max-width: 1200px;\n  margin: 0 auto;\n  padding: 15px;\n  display: flex;\n}\ndiv.id_UiProduct .panel-body .left-column {\n  width: 35%;\n  padding-right: 4%;\n}\ndiv.id_UiProduct .panel-body .right-column {\n  width: 65%;\n}\ndiv.id_UiProduct .panel-body .carousel-control {\n  background-image: none !important;\n}\ndiv.id_UiProduct .panel-body .product-description {\n  border-bottom: 1px solid #E1E8EE;\n  margin-bottom: 20px;\n}\ndiv.id_UiProduct .panel-body .product-description span {\n  font-size: 12px;\n  color: #358ED7;\n  letter-spacing: 1px;\n  text-transform: uppercase;\n  text-decoration: none;\n}\ndiv.id_UiProduct .panel-body .product-description h1 {\n  font-weight: 300;\n  font-size: 52px;\n  color: #43484D;\n  letter-spacing: -2px;\n}\ndiv.id_UiProduct .panel-body .product-description p {\n  font-size: 16px;\n  font-weight: 300;\n  color: #86939E;\n  line-height: 24px;\n}\ndiv.id_UiProduct .panel-body .product-price {\n  display: flex;\n  align-items: center;\n}\ndiv.id_UiProduct .panel-body .product-price .id_product_price {\n  font-size: 26px;\n  font-weight: 300;\n  color: #43474D;\n  margin-right: 20px;\n}\n@media (max-width: 940px) {\n  div.id_UiProduct .panel-body {\n    flex-direction: column;\n    /*margin-top    : 60px;*/\n  }\n  div.id_UiProduct .panel-body .left-column,\n  div.id_UiProduct .panel-body .right-column {\n    width: 100%;\n  }\n  div.id_UiProduct .panel-body .carousel {\n    max-width: 445px;\n    margin: auto;\n  }\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":9}],24:[function(require,module,exports){
module.exports = "<li class=\"id_UiShipTo dropdown\">\r\n\r\n    <a href=\"#\" data-toggle=\"dropdown\" aria-expanded=\"false\">\r\n        <span>Ship to</span>\r\n        <div class=\"id_flag iti-flag\"></div>\r\n    </a>\r\n\r\n    <div class=\"dropdown-menu dropdown-form dynamic-settings right animated fadeIn\" role=\"menu\">\r\n\r\n        <div class=\"id_countrySelector\" data-showspecial=\"false\" data-showflags=\"true\" data-i18nall=\"All selected\"\r\n            data-i18nnofilter=\"No selection\" data-i18nfilter=\"Filter\">\r\n        </div>\r\n\r\n    </div>\r\n\r\n</li>";
},{}],25:[function(require,module,exports){
var css = ".id_UiShipTo {\n  /*@media all and (max-width: 767px) {*/\n}\n@media all and (max-width: 768px) {\n  .id_UiShipTo {\n    top: -21px;\n  }\n}\n.id_UiShipTo .id_countrySelector {\n  width: 200px;\n}\n.id_UiShipTo .dropdown-menu.dynamic-settings {\n  min-width: unset !important;\n}\n.id_UiShipTo .dropdown-menu {\n  border-bottom-width: 0px;\n  border-left-width: 0px;\n  border-right-width: 0px;\n}\n.id_UiShipTo .iti-flag {\n  display: inline-block;\n  position: relative;\n  top: 2px;\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":9}],26:[function(require,module,exports){
module.exports = "<!-- Panel Modal -->\r\n<div class=\"id_UiShippingForm modal fade\" tabindex=\"-1\" role=\"dialog\">\r\n    <div class=\"modal-dialog\">\r\n        <div class=\"modal-content\">\r\n            <div class=\"modal-body p0\">\r\n                <div class=\"panel panel-default mb0\">\r\n                    <!-- Start .panel -->\r\n                    <div class=\"panel-heading\">\r\n                        <h4 class=\"panel-title\">Shipping information</h4>\r\n                        <div class=\"panel-controls panel-controls-right\">\r\n                            <a href=\"#\" class=\"panel-close id_close\">\r\n                                <i class=\"fa fa-times\"></i>\r\n                            </a>\r\n                        </div>\r\n\r\n                    </div>\r\n                    <div class=\"panel-body\">\r\n                        <div class=\"row\">\r\n\r\n                            <div class=\"col-sm-12 col-md-6 pb5\">\r\n                                <label>First name *</label>\r\n                                <input class=\"id_firstName form-control\" type=\"text\" />\r\n                            </div>\r\n\r\n                            <div class=\"col-sm-12 col-md-6 pb5\">\r\n                                <label>Last name *</label>\r\n                                <input class=\"id_lastName form-control\" type=\"text\" />\r\n                            </div>\r\n\r\n\r\n                            <div class=\"col-sm-12 pb5\">\r\n\r\n                                <label>Shipping address *</label>\r\n                                <input class=\"id_placeAutocomplete form-control\" placeholder=\"Enter your address\"\r\n                                    type=\"text\" />\r\n\r\n\r\n                            </div>\r\n\r\n                            <div class=\"col-sm-12 pb5\">\r\n                                <label>Extra infos (optional)</label>\r\n                                <input class=\"id_extra form-control\" type=\"text\"\r\n                                    placeholder=\"Something that could help the postman\" />\r\n                            </div>\r\n\r\n                            <div class=\"col-sm-12\">\r\n\r\n                                <div style=\"float: right\">\r\n\r\n                                    <button class=\"btn btn-success btn-sm\" type=\"button\">\r\n                                        <i class=\"glyphicon glyphicon-ok\"></i>\r\n                                    </button>\r\n\r\n                                </div>\r\n\r\n                            </div>\r\n\r\n\r\n                        </div>\r\n\r\n\r\n\r\n                    </div>\r\n\r\n\r\n                </div>\r\n            </div>\r\n            <!-- End .panel -->\r\n        </div>\r\n    </div>\r\n</div>";
},{}],27:[function(require,module,exports){
var css = "@media all and (max-width: 768px) {\n  .id_UiShippingForm .id_placeAutocomplete {\n    font-size: 80%;\n    padding-left: 2px;\n    padding-right: 0;\n  }\n  .id_UiShippingForm .panel-body {\n    padding: 0;\n  }\n}\n.id_UiShippingForm .field-error {\n  border-color: #db5565;\n}\n.pac-container {\n  z-index: 10000 !important;\n}\n.pac-container:after {\n  content: none !important;\n}\n@media all and (max-width: 768px) {\n  .pac-container span {\n    font-size: 80%;\n  }\n  .pac-container .pac-icon {\n    display: none;\n  }\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":9}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var web_api_declaration_1 = require("../../../../gateway/dist/web_api_declaration");
exports.webApiPath = web_api_declaration_1.apiPath;

},{"../../../../gateway/dist/web_api_declaration":46}],29:[function(require,module,exports){
"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var PageName;
(function (PageName) {
    var _a;
    PageName.pagesNames = [
        "login",
        "register",
        "manager",
        "webphone",
        "subscription",
        "shop",
        "webviewphone"
    ];
    _a = __read(PageName.pagesNames, 7), PageName.login = _a[0], PageName.register = _a[1], PageName.manager = _a[2], PageName.webphone = _a[3], PageName.subscription = _a[4], PageName.shop = _a[5], PageName.webviewphone = _a[6];
})(PageName = exports.PageName || (exports.PageName = {}));

},{}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseDomain = window.location.href.match(/^https:\/\/web\.([^\/]+)/)[1];
//NOTE: Defined at ejs building in templates/head_common.ejs
exports.assetsRoot = window["assets_root"];
exports.isDevEnv = window["isDevEnv"];

},{}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Assert jQuery is loaded on the page. */
function loadUiClassHtml(html, widgetClassName) {
    var wrap = $("<div>").html(html);
    $("head").append(wrap.find("style"));
    return {
        "structure": wrap.find(".id_" + widgetClassName),
        "templates": wrap.find(".templates")
    };
}
exports.loadUiClassHtml = loadUiClassHtml;

},{}],32:[function(require,module,exports){
"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var availablePackaging = {
    "light": {
        "weight": 21.5,
        "eurAmount": 20
    },
    "normal": {
        "weight": 45,
        "eurAmount": 50
    }
};
function getZone(destinationCountryIso) {
    var out = (function () {
        if (getZone.national.indexOf(destinationCountryIso) >= 0) {
            return "Metropolitan France, Andorra et Monaco";
        }
        if (__spread(getZone.om1, getZone.om2).indexOf(destinationCountryIso) >= 0) {
            return "DOM";
        }
        if ([
            "be", "el", "lt", "pt", "bg", "es", "lu", "ro", "cz", "fr",
            "hu", "si", "dk", "hr", "mt", "sk", "de", "it", "nl", "fi",
            "ee", "cy", "at", "se", "ie", "lv", "pl", "uk"
        ].indexOf(destinationCountryIso) > 0) {
            return "Europe";
        }
        if ([
            "no", "by", "hu​", "md", "ua", "dz",
            "ly", "ma", "eh", "mr", "tn"
        ].indexOf(destinationCountryIso) >= 0) {
            return "Eastern Europe - Maghreb - Norway";
        }
        return "Rest of the world";
    })();
    console.log("getZone(" + destinationCountryIso + ") -> " + out);
    return out;
}
(function (getZone) {
    getZone.national = ["fr", "mc", "ad"];
    getZone.om1 = ["gf", "gp", "mq", "re", "pm", "bl", "mf", "yt"];
    getZone.om2 = ["nc", "pf", "wf", "tf"];
})(getZone || (getZone = {}));
function getLaPostDelay(destinationCountryIso) {
    var out = (function () {
        if (destinationCountryIso === "de") {
            return [3, 4];
        }
        switch (destinationCountryIso) {
            case "de": return [3, 4];
            case "at": return [3, 5];
            case "be": return [3, 5];
            case "it": return [3, 5];
            case "nl": return [3, 6];
            case "pt": return [3, 6];
            case "gb": return [3, 4];
            case "ch": return [3, 5];
            case "ca": return [4, 8];
            case "us": return [4, 8];
        }
        var zone = getZone(destinationCountryIso);
        switch (zone) {
            case "Metropolitan France, Andorra et Monaco": return [1, 2];
            case "DOM": return [4, 7];
            case "Europe":
            case "Eastern Europe - Maghreb - Norway": return [6, 8];
            default: return [7, 12];
        }
    })();
    console.log("getLaPostDelay(" + destinationCountryIso + ") -> " + out);
    return out;
}
/** To use for delivery to france and DOM Flat */
function solveLaPost(_a) {
    var footprint = _a.footprint, weight = _a.weight, destinationCountryIso = _a.destinationCountryIso;
    var out = (function () {
        if (footprint === "VOLUME") {
            throw new Error("Volume not supported by La Poste ( max 3cm )");
        }
        var packaging = weight + availablePackaging.light.weight < 100 ?
            availablePackaging.light : availablePackaging.normal;
        var totalWeight = weight + packaging.weight;
        if (totalWeight > 250) {
            throw new Error("Suboptimal for parcel > 250g");
        }
        var zone = getZone(destinationCountryIso);
        if (totalWeight > 100 && zone !== "Metropolitan France, Andorra et Monaco" && zone !== "DOM") {
            throw new Error("Suboptimal for international shipping of parcel > 100g");
        }
        var eurAmount = packaging.eurAmount;
        var offer;
        if (zone === "Metropolitan France, Andorra et Monaco" || zone === "DOM") {
            offer = "Lettre prioritaire, +sticker de suivie";
            eurAmount += totalWeight < 100 ? 210 : 420;
            if (zone === "DOM") {
                //NOTE: Extra for DOM-TOM
                eurAmount += (getZone.om1.indexOf(destinationCountryIso) >= 0 ? 5 : 11)
                    * Math.floor(totalWeight / 10);
            }
            //NOTE: For tracking.
            eurAmount += 40;
        }
        else {
            offer = "Lettre suivie internationale";
            eurAmount += 580;
        }
        return {
            "carrier": "La Poste",
            offer: offer,
            "delay": getLaPostDelay(destinationCountryIso),
            eurAmount: eurAmount,
            "needLightPackage": (availablePackaging.light === packaging &&
                weight + availablePackaging.normal.weight > 100)
        };
    })();
    console.log("solveLaPoste(" + JSON.stringify({ footprint: footprint, weight: weight, destinationCountryIso: destinationCountryIso }) + " -> " + JSON.stringify(out, null, 2));
    return out;
}
function solveColissimo(_a) {
    var footprint = _a.footprint, weight = _a.weight, destinationCountryIso = _a.destinationCountryIso;
    var out = (function () {
        var zone = getZone(destinationCountryIso);
        if (zone !== "Metropolitan France, Andorra et Monaco") {
            throw new Error("Colissimo is suboptimal for shipping outside of France (zone)");
        }
        if (footprint === "FLAT" && weight + availablePackaging.light.weight < 100) {
            throw new Error("Colissimo is suboptimal for flat parcel of < 100g");
        }
        var packaging = availablePackaging.normal;
        return {
            "carrier": "Colissimo",
            "offer": "Colissimo France",
            "delay": getLaPostDelay(destinationCountryIso),
            "eurAmount": packaging.eurAmount + (function () {
                var totalWeight = weight + packaging.weight;
                if (totalWeight < 250) {
                    return 495;
                }
                else if (totalWeight < 500) {
                    return 625;
                }
                else if (totalWeight < 750) {
                    return 710;
                }
                else {
                    return 880;
                }
            })(),
            "needLightPackage": false
        };
    })();
    console.log("solveColissimo(" + JSON.stringify({ footprint: footprint, weight: weight, destinationCountryIso: destinationCountryIso }) + " -> " + JSON.stringify(out, null, 2));
    return out;
}
function solveDelivengo(_a) {
    var weight = _a.weight, destinationCountryIso = _a.destinationCountryIso;
    var out = (function () {
        var zone = getZone(destinationCountryIso);
        if (zone === "Metropolitan France, Andorra et Monaco") {
            throw new Error("Suboptimal for international");
        }
        return {
            "carrier": "Delivengo",
            "offer": "Delivengo Easy",
            "delay": getLaPostDelay(destinationCountryIso),
            "eurAmount": Math.round(1.20 * (function () {
                var totalWeight = weight + availablePackaging.normal.weight;
                var isEu = zone === "Europe";
                if (totalWeight < 250) {
                    return isEu ? 630 : 700;
                }
                else if (totalWeight < 500) {
                    return isEu ? 720 : 920;
                }
                else {
                    return isEu ? 900 : 1400;
                }
            })()),
            "needLightPackage": false
        };
    })();
    console.log("solveDelivengo(" + JSON.stringify({ weight: weight, destinationCountryIso: destinationCountryIso }) + " -> " + JSON.stringify(out, null, 2));
    return out;
}
function solve(destinationCountryIso, footprint, weight) {
    var params = { destinationCountryIso: destinationCountryIso, footprint: footprint, weight: weight };
    try {
        return solveLaPost(params);
    }
    catch (error) {
        console.log(error.message);
        try {
            return solveColissimo(params);
        }
        catch (error) {
            console.log(error.message);
            return solveDelivengo(params);
        }
    }
}
exports.solve = solve;

},{}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getProducts(assetsRoot) {
    return [
        {
            "name": "Semasim Gateway v1.0",
            "shortDescription": "PiZero powered",
            "description": [
                "-Fully plug and play",
                "-Support for one SIM card.",
                "-Support up to 3 SIM ( require additional Sim dongle, sold separately ).",
                "-Grant you 6 month of free access to Semasim subscriptions"
            ].join(" "),
            "cartImageUrl": assetsRoot + "img/sample-shop-items/raspberry.jpg",
            "imageUrls": [
                assetsRoot + "img/sample-shop-items/raspberry.jpg"
            ],
            "price": { "eur": 5900 },
            "footprint": "FLAT",
            "weight": 150
        },
        {
            "name": "SIM usb Dongle",
            "shortDescription": "Huawei E180",
            "description": [
                "Add support for more SIM cards on your Semasim gateway.",
                "OR if you already have a server like a raspberry pi you do not need",
                "the semasim gateway you simply need one of those dongles for every",
                "SIM that you want to put online. [Ref for installing manually]"
            ].join(" "),
            "cartImageUrl": assetsRoot + "img/sample-shop-items/e180_cart.jpg",
            "imageUrls": [
                assetsRoot + "img/sample-shop-items/e180.jpg",
                assetsRoot + "img/sample-shop-items/e180_1.png",
                assetsRoot + "img/sample-shop-items/adapter.jpg"
            ],
            "price": { "eur": 1490 },
            "footprint": "FLAT",
            "weight": 35
        },
        {
            "name": "Sim adapter",
            "shortDescription": "Adapter for nano and micro SIM",
            "description": "Adapter to put a nano or micro sim in the SIM's dongle",
            "cartImageUrl": assetsRoot + "img/sample-shop-items/adapter_cart.jpg",
            "imageUrls": [assetsRoot + "img/sample-shop-items/adapter.jpg"],
            "price": { "eur": 290 },
            "footprint": "FLAT",
            "weight": 10
        }
    ];
}
exports.getProducts = getProducts;
;

},{}],34:[function(require,module,exports){
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var currencyLib = require("../../tools/currency");
var Cart;
(function (Cart) {
    function getPrice(cart, convertFromEuro) {
        var out = cart
            .map(function (_a) {
            var price = _a.product.price, quantity = _a.quantity;
            return Price.operation(price, function (amount) { return amount * quantity; });
        })
            .reduce(function (out, price) { return Price.addition(out, price, convertFromEuro); }, { "eur": 0 });
        //console.log("Cart.getGoodsPrice: ", JSON.stringify({ cart, out }, null, 2));
        return out;
    }
    Cart.getPrice = getPrice;
    function getOverallFootprint(cart) {
        return !!cart.find(function (_a) {
            var product = _a.product;
            return product.footprint === "VOLUME";
        }) ? "VOLUME" : "FLAT";
    }
    Cart.getOverallFootprint = getOverallFootprint;
    function getOverallWeight(cart) {
        return cart.reduce(function (out, _a) {
            var weight = _a.product.weight, quantity = _a.quantity;
            return out + weight * quantity;
        }, 0);
    }
    Cart.getOverallWeight = getOverallWeight;
})(Cart = exports.Cart || (exports.Cart = {}));
var Price;
(function (Price) {
    /**
     * Out of place.
     * If the amount for a currency is defined in one object
     * but not in the other the undefined amount will be
     * computed from the rateChange
     *
     */
    function binaryOperation(price1, price2, op, convertFromEuro) {
        var e_1, _a, e_2, _b;
        price1 = __assign({}, price1);
        price2 = __assign({}, price2);
        try {
            //NOTE: Ugly but does not involve map and less verbose.
            for (var _c = __values(__spread(Object.keys(price1), Object.keys(price2))), _d = _c.next(); !_d.done; _d = _c.next()) {
                var currency = _d.value;
                try {
                    for (var _e = (e_2 = void 0, __values([price1, price2])), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var price = _f.value;
                        if (!(currency in price)) {
                            price[currency] = convertFromEuro(price["eur"], currency);
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var out = { "eur": 0 };
        for (var currency in price1) {
            out[currency] = op(price1[currency], price2[currency]);
        }
        return out;
    }
    Price.binaryOperation = binaryOperation;
    function operation(price, op) {
        var out = { "eur": 0 };
        for (var currency in price) {
            out[currency] = Math.round(op(price[currency]));
        }
        return out;
    }
    Price.operation = operation;
    function addition(price1, price2, convertFromEuro) {
        return binaryOperation(price1, price2, function (amount1, amount2) { return amount1 + amount2; }, convertFromEuro);
    }
    Price.addition = addition;
    /**
     * return the amount of a price in a given currency.
     * If the amount for the currency is not defined in
     * the price object it will be computer from the
     * euro amount.
     * */
    function getAmountInCurrency(price, currency, convertFromEuro) {
        return currency in price ?
            price[currency] :
            convertFromEuro(price["eur"], currency);
    }
    Price.getAmountInCurrency = getAmountInCurrency;
    function prettyPrint(price, currency, convertFromEuro) {
        return currencyLib.prettyPrint(getAmountInCurrency(price, currency, convertFromEuro), currency);
    }
    Price.prettyPrint = prettyPrint;
})(Price = exports.Price || (exports.Price = {}));
;
var ShippingFormData;
(function (ShippingFormData) {
    function toStripeShippingInformation(shippingFormData, carrier) {
        var get = function (key) {
            var component = shippingFormData.addressComponents
                .find(function (_a) {
                var _b = __read(_a.types, 1), type = _b[0];
                return type === key;
            });
            return component !== undefined ? component["long_name"] : undefined;
        };
        return {
            "name": shippingFormData.firstName + " " + shippingFormData.lastName,
            "address": {
                "line1": get("street_number") + " " + get("route"),
                "line2": shippingFormData.addressExtra,
                "postal_code": get("postal_code") || "",
                "city": get("locality") || "",
                "state": get("administrative_area_level_1") || "",
                "country": get("country") || ""
            },
            carrier: carrier,
        };
    }
    ShippingFormData.toStripeShippingInformation = toStripeShippingInformation;
})(ShippingFormData = exports.ShippingFormData || (exports.ShippingFormData = {}));

},{"../../tools/currency":37}],35:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var apiDeclaration = require("../web_api_declaration");
var ttJC = require("transfer-tools/dist/lib/JSON_CUSTOM");
var webApiPath_1 = require("../gateway/webApiPath");
//NOTE: Assert jQuery loaded on the page
var JSON_CUSTOM = ttJC.get();
function sendRequest(methodName, params) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) { return window["$"].ajax({
                    "url": webApiPath_1.webApiPath + "/" + methodName,
                    "method": "POST",
                    "data": JSON_CUSTOM.stringify(params),
                    "dataType": "text",
                    "statusCode": {
                        "400": function () { return alert("Bad request ( bug in the client )"); },
                        "401": function () { return window.location.reload(); },
                        "500": function () { return alert("Bug on the server, sorry :("); },
                        "200": function (data) { return resolve(JSON_CUSTOM.parse(data)); }
                    }
                }); })];
        });
    });
}
exports.registerUser = (function () {
    var methodName = apiDeclaration.registerUser.methodName;
    return function (email, secret, towardUserEncryptKeyStr, encryptedSymmetricKey) {
        return sendRequest(methodName, {
            email: email,
            secret: secret,
            towardUserEncryptKeyStr: towardUserEncryptKeyStr,
            encryptedSymmetricKey: encryptedSymmetricKey
        });
    };
})();
exports.validateEmail = (function () {
    var methodName = apiDeclaration.validateEmail.methodName;
    return function (email, activationCode) {
        return sendRequest(methodName, { email: email, activationCode: activationCode });
    };
})();
exports.loginUser = (function () {
    var methodName = apiDeclaration.loginUser.methodName;
    return function (email, secret) {
        return sendRequest(methodName, { email: email, secret: secret });
    };
})();
exports.logoutUser = (function () {
    var methodName = apiDeclaration.logoutUser.methodName;
    return function () {
        return sendRequest(methodName, undefined);
    };
})();
/** Return true if email has account */
exports.sendRenewPasswordEmail = (function () {
    var methodName = apiDeclaration.sendRenewPasswordEmail.methodName;
    return function (email) {
        return sendRequest(methodName, { email: email });
    };
})();
exports.renewPassword = (function () {
    var methodName = apiDeclaration.renewPassword.methodName;
    return function (email, newSecret, newTowardUserEncryptKeyStr, newEncryptedSymmetricKey, token) {
        return sendRequest(methodName, {
            email: email,
            newSecret: newSecret,
            newTowardUserEncryptKeyStr: newTowardUserEncryptKeyStr,
            newEncryptedSymmetricKey: newEncryptedSymmetricKey,
            token: token
        });
    };
})();
exports.getCountryIso = (function () {
    var methodName = apiDeclaration.getCountryIso.methodName;
    return function () {
        return sendRequest(methodName, undefined);
    };
})();
exports.getChangesRates = (function () {
    var methodName = apiDeclaration.getChangesRates.methodName;
    return function () {
        return sendRequest(methodName, undefined);
    };
})();
exports.getSubscriptionInfos = (function () {
    var methodName = apiDeclaration.getSubscriptionInfos.methodName;
    return function () {
        return sendRequest(methodName, undefined);
    };
})();
exports.subscribeOrUpdateSource = (function () {
    var methodName = apiDeclaration.subscribeOrUpdateSource.methodName;
    return function (sourceId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, { sourceId: sourceId })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.unsubscribe = (function () {
    var methodName = apiDeclaration.unsubscribe.methodName;
    return function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(methodName, undefined)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
})();
exports.createStripeCheckoutSessionForShop = (function () {
    var methodName = apiDeclaration.createStripeCheckoutSessionForShop.methodName;
    return function (cart, shippingFormData, currency, success_url, cancel_url) {
        return sendRequest(methodName, {
            "cartDescription": cart.map(function (_a) {
                var product = _a.product, quantity = _a.quantity;
                return ({
                    "productName": product.name,
                    quantity: quantity
                });
            }),
            shippingFormData: shippingFormData,
            currency: currency,
            success_url: success_url,
            cancel_url: cancel_url
        });
    };
})();
exports.createStripeCheckoutSessionForSubscription = (function () {
    var methodName = apiDeclaration.createStripeCheckoutSessionForSubscription.methodName;
    return function (currency, success_url, cancel_url) {
        return sendRequest(methodName, {
            currency: currency,
            success_url: success_url,
            cancel_url: cancel_url
        });
    };
})();
exports.getOrders = (function () {
    var methodName = apiDeclaration.getOrders.methodName;
    return function () {
        return sendRequest(methodName, undefined);
    };
})();

},{"../gateway/webApiPath":28,"../web_api_declaration":39,"transfer-tools/dist/lib/JSON_CUSTOM":44}],36:[function(require,module,exports){
"use strict";
//TODO: Assert jQuery bootstrap and bootbox loaded on the page.
Object.defineProperty(exports, "__esModule", { value: true });
var modal_stack = require("./modal_stack");
var currentLoading = undefined;
var currentModal = undefined;
var restoreLoading = undefined;
function dismissLoading() {
    if (currentLoading) {
        currentLoading.stop();
        currentLoading = undefined;
    }
    if (restoreLoading) {
        restoreLoading = undefined;
    }
}
exports.dismissLoading = dismissLoading;
function loading(message, delayBeforeShow) {
    if (delayBeforeShow === void 0) { delayBeforeShow = 700; }
    if (currentModal) {
        restoreLoading = function () { return loading(message, delayBeforeShow); };
        return;
    }
    if (currentLoading) {
        delayBeforeShow = 0;
    }
    dismissLoading();
    var modal = undefined;
    var timer = setTimeout(function () {
        var options = {
            "message": [
                '<p class="text-center">',
                '<i class="fa fa-spin fa-spinner"></i>&nbsp;&nbsp;',
                "<span class=\"" + loading.spanClass + "\">" + message + "</span>",
                "</p>"
            ].join(""),
            "closeButton": false
        };
        modal = run("dialog", [options], true);
    }, delayBeforeShow);
    currentLoading = {
        "stop": function () { return modal ? modal.modal("hide") : clearTimeout(timer); },
        message: message,
        delayBeforeShow: delayBeforeShow
    };
}
exports.loading = loading;
(function (loading) {
    loading.spanClass = "loading_message";
})(loading = exports.loading || (exports.loading = {}));
function run(method, args, isLoading) {
    if (isLoading === void 0) { isLoading = false; }
    if (!isLoading && currentModal) {
        currentModal.modal("hide");
        return run(method, args, false);
    }
    if (!isLoading && currentLoading) {
        var message_1 = currentLoading.message;
        var delayBeforeShow_1 = currentLoading.delayBeforeShow;
        dismissLoading();
        restoreLoading = function () { return loading(message_1, delayBeforeShow_1); };
    }
    var options = typeof args[0] === "string" ? ({
        "message": args[0],
        "callback": args[1]
    }) : args[0];
    if (!("animate" in options)) {
        options.animate = false;
    }
    options.show = false;
    //let modal: JQuery = bootbox[method].apply(bootbox, args);
    var modal = bootbox[method](options);
    modal_stack.add(modal, null).show();
    if (!isLoading) {
        currentModal = modal;
    }
    modal.one("hide.bs.modal", function () {
        if (!isLoading) {
            currentModal = undefined;
        }
    });
    modal.one("hidden.bs.modal", function () {
        if (restoreLoading) {
            restoreLoading();
        }
        modal.data("bs.modal", null);
        modal.remove();
    });
    return modal;
}
function dialog(options) {
    return run("dialog", [options]);
}
exports.dialog = dialog;
function alert() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return run("alert", args);
}
exports.alert = alert;
function prompt(options) {
    return run("prompt", [options]);
}
exports.prompt = prompt;
function confirm(options) {
    return run("confirm", [options]);
}
exports.confirm = confirm;

},{"./modal_stack":38}],37:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = require("../../res/currency.json");
function isValidCountryIso(countryIso) {
    //NOTE: Avoid loading if we do not need
    if (isValidCountryIso.countryIsoRecord === undefined) {
        isValidCountryIso.countryIsoRecord = (function () {
            var e_1, _a, e_2, _b;
            var out = {};
            try {
                for (var _c = __values(Object.keys(exports.data)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var currency = _d.value;
                    try {
                        for (var _e = (e_2 = void 0, __values(exports.data[currency].countriesIso)), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var countryIso_1 = _f.value;
                            out[countryIso_1] = true;
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return out;
        })();
        return isValidCountryIso(countryIso);
    }
    if (typeof countryIso !== "string" || !/^[a-z]{2}$/.test(countryIso)) {
        return false;
    }
    return !!isValidCountryIso.countryIsoRecord[countryIso];
}
exports.isValidCountryIso = isValidCountryIso;
(function (isValidCountryIso) {
    isValidCountryIso.countryIsoRecord = undefined;
})(isValidCountryIso = exports.isValidCountryIso || (exports.isValidCountryIso = {}));
function getCountryCurrency(countryIso) {
    var cache = getCountryCurrency.cache;
    {
        var currency = cache[countryIso];
        if (currency !== undefined) {
            return currency;
        }
    }
    cache[countryIso] = Object.keys(exports.data)
        .map(function (currency) { return ({ currency: currency, "countriesIso": exports.data[currency].countriesIso }); })
        .find(function (_a) {
        var countriesIso = _a.countriesIso;
        return !!countriesIso.find(function (_countryIso) { return _countryIso === countryIso; });
    })
        .currency;
    return getCountryCurrency(countryIso);
}
exports.getCountryCurrency = getCountryCurrency;
(function (getCountryCurrency) {
    getCountryCurrency.cache = {};
})(getCountryCurrency = exports.getCountryCurrency || (exports.getCountryCurrency = {}));
/** Must define convertFromEuro.changeRates first */
function convertFromEuro(euroAmount, currencyTo) {
    return Math.round(euroAmount * convertFromEuro.getChangeRates()[currencyTo]);
}
exports.convertFromEuro = convertFromEuro;
(function (convertFromEuro) {
    var changeRates_ = undefined;
    var lastUpdateDate = new Date(0);
    function setChangeRates(changeRates) {
        lastUpdateDate = new Date();
        changeRates_ = changeRates;
    }
    convertFromEuro.setChangeRates = setChangeRates;
    function getChangeRates() {
        if (changeRates_ === undefined) {
            throw new Error("Change rates not defined");
        }
        return changeRates_;
    }
    convertFromEuro.getChangeRates = getChangeRates;
    var updater = undefined;
    function setChangeRatesFetchMethod(fetchChangeRates, ttl) {
        updater = { fetchChangeRates: fetchChangeRates, ttl: ttl };
    }
    convertFromEuro.setChangeRatesFetchMethod = setChangeRatesFetchMethod;
    function refreshChangeRates() {
        return __awaiter(this, void 0, void 0, function () {
            var _a, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (updater === undefined) {
                            throw new Error("No method for updating rates changes have been defined");
                        }
                        if (Date.now() - lastUpdateDate.getTime() < updater.ttl) {
                            return [2 /*return*/];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        _a = setChangeRates;
                        return [4 /*yield*/, updater.fetchChangeRates()];
                    case 2:
                        _a.apply(void 0, [_b.sent()]);
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _b.sent();
                        if (lastUpdateDate.getTime() === 0) {
                            throw error_1;
                        }
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    convertFromEuro.refreshChangeRates = refreshChangeRates;
})(convertFromEuro = exports.convertFromEuro || (exports.convertFromEuro = {}));
/**
 * get currency of stripe card,
 * if there is no special pricing for the currency
 * "eur" will be returned.
 *
 * NOTE: This function does seems to come out of left field
 * but this operation is done on the frontend and the backend
 * so we export it.
 *
 */
function getCardCurrency(stripeCard, pricingByCurrency) {
    var currency = getCountryCurrency(stripeCard.country.toLowerCase());
    if (!(currency in pricingByCurrency)) {
        currency = "eur";
    }
    return currency;
}
exports.getCardCurrency = getCardCurrency;
function prettyPrint(amount, currency) {
    return (amount / 100).toLocaleString(undefined, {
        "style": "currency",
        currency: currency
    });
}
exports.prettyPrint = prettyPrint;

},{"../../res/currency.json":45}],38:[function(require,module,exports){
"use strict";
//TODO: Assert jQuery bootstrap loaded on the page.
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var stack = [];
var onHideKey = " __hide_handler__ ";
function add(modal, options) {
    var _this = this;
    //NOTE: null only when called by bootbox_custom.
    if (options !== null) {
        modal.modal(__assign({}, options, { "show": false }));
    }
    return {
        "show": function () { return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
            var currentModal_1, prHidden;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (stack.indexOf(modal) >= 0) {
                            resolve();
                            return [2 /*return*/];
                        }
                        stack.push(modal);
                        modal[onHideKey] = function () {
                            var index = stack.indexOf(modal);
                            var wasOnTop = index === stack.length - 1;
                            stack.splice(index, 1);
                            if (wasOnTop && stack.length !== 0) {
                                var modalToRestore_1 = stack[stack.length - 1];
                                modalToRestore_1[" scheduled to be shown "] = true;
                                /*
                                NOTE: To prevent flickering we do not restore
                                the previous modal if an other one is immediately
                                opened ( form with successive bootbox_custom )
                                */
                                setTimeout(function () {
                                    delete modalToRestore_1[" scheduled to be shown "];
                                    if (modalToRestore_1 !== stack[stack.length - 1]) {
                                        return;
                                    }
                                    modalToRestore_1.modal("show");
                                }, 100);
                            }
                        };
                        modal.one("hide.bs.modal", modal[onHideKey]);
                        if (!(stack.length !== 1)) return [3 /*break*/, 2];
                        currentModal_1 = stack[stack.length - 2];
                        if (!!currentModal_1[" scheduled to be shown "]) return [3 /*break*/, 2];
                        currentModal_1.off("hide.bs.modal", undefined, currentModal_1[onHideKey]);
                        prHidden = new Promise(function (resolve) { return currentModal_1.one("hidden.bs.modal", function () { return resolve(); }); });
                        currentModal_1.modal("hide");
                        currentModal_1.one("hide.bs.modal", currentModal_1[onHideKey]);
                        return [4 /*yield*/, prHidden];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        modal.one("shown.bs.modal", function () { return resolve(); });
                        modal.modal("show");
                        return [2 /*return*/];
                }
            });
        }); }); },
        "hide": function () { return new Promise(function (resolve) {
            if (stack.indexOf(modal) < 0) {
                resolve();
                return;
            }
            modal.one("hidden.bs.modal", function () { return resolve(); });
            modal.modal("hide");
        }); }
    };
}
exports.add = add;

},{}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var registerUser;
(function (registerUser) {
    registerUser.methodName = "register-user";
})(registerUser = exports.registerUser || (exports.registerUser = {}));
var validateEmail;
(function (validateEmail) {
    validateEmail.methodName = "validate-email";
})(validateEmail = exports.validateEmail || (exports.validateEmail = {}));
var loginUser;
(function (loginUser) {
    loginUser.methodName = "login-user";
})(loginUser = exports.loginUser || (exports.loginUser = {}));
var logoutUser;
(function (logoutUser) {
    logoutUser.methodName = "logout-user";
})(logoutUser = exports.logoutUser || (exports.logoutUser = {}));
var sendRenewPasswordEmail;
(function (sendRenewPasswordEmail) {
    sendRenewPasswordEmail.methodName = "send-renew-password-email";
})(sendRenewPasswordEmail = exports.sendRenewPasswordEmail || (exports.sendRenewPasswordEmail = {}));
var renewPassword;
(function (renewPassword) {
    renewPassword.methodName = "renew-password";
})(renewPassword = exports.renewPassword || (exports.renewPassword = {}));
var getCountryIso;
(function (getCountryIso) {
    getCountryIso.methodName = "guess-country-iso";
})(getCountryIso = exports.getCountryIso || (exports.getCountryIso = {}));
var getChangesRates;
(function (getChangesRates) {
    getChangesRates.methodName = "get-changes-rates";
})(getChangesRates = exports.getChangesRates || (exports.getChangesRates = {}));
var getSubscriptionInfos;
(function (getSubscriptionInfos) {
    getSubscriptionInfos.methodName = "get-subscription-infos";
})(getSubscriptionInfos = exports.getSubscriptionInfos || (exports.getSubscriptionInfos = {}));
var subscribeOrUpdateSource;
(function (subscribeOrUpdateSource) {
    subscribeOrUpdateSource.methodName = "subscribe-or-update-source";
})(subscribeOrUpdateSource = exports.subscribeOrUpdateSource || (exports.subscribeOrUpdateSource = {}));
var unsubscribe;
(function (unsubscribe) {
    unsubscribe.methodName = "unsubscribe";
})(unsubscribe = exports.unsubscribe || (exports.unsubscribe = {}));
var createStripeCheckoutSessionForShop;
(function (createStripeCheckoutSessionForShop) {
    createStripeCheckoutSessionForShop.methodName = "create-stripe-checkout-session-for-shop";
})(createStripeCheckoutSessionForShop = exports.createStripeCheckoutSessionForShop || (exports.createStripeCheckoutSessionForShop = {}));
var createStripeCheckoutSessionForSubscription;
(function (createStripeCheckoutSessionForSubscription) {
    createStripeCheckoutSessionForSubscription.methodName = "create-stripe-checkout-session-for-subscription";
})(createStripeCheckoutSessionForSubscription = exports.createStripeCheckoutSessionForSubscription || (exports.createStripeCheckoutSessionForSubscription = {}));
var getOrders;
(function (getOrders) {
    getOrders.methodName = "get-orders";
})(getOrders = exports.getOrders || (exports.getOrders = {}));

},{}],40:[function(require,module,exports){
'use strict';

/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr = Object.prototype.toString;
var funcType = '[object Function]';

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slice.call(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                args.concat(slice.call(arguments))
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        } else {
            return target.apply(
                that,
                args.concat(slice.call(arguments))
            );
        }
    };

    var boundLength = Math.max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs.push('$' + i);
    }

    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};

},{}],41:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":40}],42:[function(require,module,exports){
'use strict';

var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":41}],43:[function(require,module,exports){
(function (global){
"use strict";
var has = require('has');

var toString = Object.prototype.toString;
var keys = Object.keys;
var jsonParse = JSON.parse;
var jsonStringify = JSON.stringify;
var identifierFormat = '[a-zA-Z_$][0-9a-zA-Z_$]*';
var identifierPattern = new RegExp('^' + identifierFormat + '$');
var functionPattern = new RegExp(
  '^\\s*function(?:\\s+' + identifierFormat  + ')?\\s*' +
  '\\(\\s*(?:(' + identifierFormat + ')' +
  '((?:\\s*,\\s*' + identifierFormat + ')*)?)?\\s*\\)\\s*' + 
  '\\{([\\s\\S]*)\\}\\s*', 'm');
var nativeFunctionBodyPattern = /^\s\[native\scode\]\s$/;

function isArray(obj) {
  return toString.call(obj) === '[object Array]';
}

function escapeForRegExp(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function isReplaceable(obj) {
  /*jshint -W122 */
  return (typeof obj === 'object' && obj !== null) ||
    typeof obj === 'function' || typeof obj === 'symbol';
}

var dateSerializer = {
  serialize: function(date) {
    return [date.getTime()];
  },
  deserialize: function(time) {
    return new Date(time);
  },
  isInstance: function(obj) {
    return obj instanceof Date;
  },
  name: 'Date'
};

var regExpSerializer = {
  serialize: function(regExp) {
    var flags = '';
    if (regExp.global) flags += 'g';
    if (regExp.multiline) flags += 'm';
    if (regExp.ignoreCase) flags += 'i';
    return [regExp.source, flags];
  },
  deserialize: function(source, flags) {
    return new RegExp(source, flags);
  },
  isInstance: function(obj) {
    return obj instanceof RegExp;
  },
  name: 'RegExp'
};

var functionSerializer = {
  serialize: function(f) {
    var firstArg, functionBody, parts, remainingArgs;
    var args = '';

    parts = functionPattern.exec(f.toString());

    if (!parts)
      throw new Error('Functions must have a working toString method' +
                      'in order to be serialized');

    firstArg = parts[1];
    remainingArgs = parts[2];
    functionBody = parts[3];

    if (nativeFunctionBodyPattern.test(functionBody))
      throw new Error('Native functions cannot be serialized');
    
    if (firstArg)
      args += firstArg.trim();

    if (remainingArgs) {
      remainingArgs = remainingArgs.split(',').slice(1);
      for (var i = 0; i < remainingArgs.length; i += 1) {
        args += ', ' + remainingArgs[i].trim();
      }
    }

    return [args, functionBody];
  },
  deserialize: function(args, functionBody) {
    var rv = new Function(args, functionBody);
    return rv;
  },
  isInstance: function(obj) {
    return typeof obj === 'function';
  },
  name: 'Function'
};

var symbolSerializer;

if (typeof global.Symbol !== 'undefined') {
  (function(Symbol) {
   /*jshint -W122 */
    // add symbol serializer for es6. this will probably break for private
    // symbols.
    symbolSerializer = {
      serialize: function(sym) {
        var key = Symbol.keyFor(sym);
        if (typeof key === 'string') {
          // symbol registered globally
          return [key, 0, 0];
        }
        var symStr = sym.toString();
        var match = /^Symbol\(Symbol\.([^)]+)\)$/.exec(symStr);
        if (match && has(Symbol, match[1])) {
          // well known symbol, return the key in the Symbol object
          return [0, match[1], 0];
        }
        match = /^Symbol\(([^)]*)\)$/.exec(symStr);
        return [0, 0, match[1]];
      },
      deserialize: function(key, wellKnownKey, description) {
        if (key) {
          return Symbol.for(key);
        } else if (wellKnownKey) {
          return Symbol[wellKnownKey];
        }
        return Symbol(description);
      },
      isInstance: function(obj) {
        return typeof obj === 'symbol';
      },
      name: 'Symbol'
    };
  })(global.Symbol);
}

var defaultOpts = {
  magic: '#!',
  serializers: [dateSerializer, regExpSerializer, functionSerializer]
};

if (symbolSerializer)
  defaultOpts.serializers.push(symbolSerializer);

function create(options) {
  var magic = escapeForRegExp((options && options.magic) ||
                              defaultOpts.magic);
  var initialSerializers = (options && options.serializers) ||
    defaultOpts.serializers;
  var serializers = [];
  var magicEscaper = new RegExp('([' + magic + '])', 'g');
  var magicUnescaper = new RegExp('([' + magic + '])\\1', 'g');
  var superJsonStringPattern = new RegExp('^([' + magic + ']+)' +
                                    '(' + identifierFormat +
                                    '\\[.*\\])$');
  var superJsonPattern = new RegExp('^' + magic +
                                    '(' + identifierFormat + ')' +
                                    '(\\[.*\\])$');


  function installSerializer(serializer) {
    if (typeof serializer.name === 'function') {
      if (serializer.deserialize) {
        throw new Error('Serializers with a function name should not define ' +
                        'a deserialize function');
      }
    } else {
      if (!identifierPattern.test(serializer.name))
        throw new Error("Serializers must have a 'name' property " +
                        'that is a valid javascript identifier.');

      if (typeof serializer.deserialize !== 'function' &&
          typeof serializer.replace !== 'function')
        throw new Error("Serializers must have a 'deserialize' function " +
                        'that when passed the arguments generated by ' +
                        "'serialize' will return a instance that is equal " +
                        'to the one serialized');
    }

    if (typeof serializer.serialize !== 'function' &&
        typeof serializer.replace !== 'function')
      throw new Error("Serializers must have a 'serialize' function " +
                      'that will receive an instance and return an array ' +
                      'of arguments necessary to reconstruct the object ' +
                      'state.');

    if (typeof serializer.isInstance !== 'function')
      throw new Error("Serializers must have a 'isInstance' function " +
                      'that tells if an object is an instance of the ' +
                      'type represented by the serializer');

    serializers.push(serializer);
  }

  function stringify(obj, userReplacer, indent) {
    function replaceValue(value) {
      var match;

      if (typeof value === 'string' && 
          (match = superJsonStringPattern.exec(value))) {
        // Escape magic string at the start only
        return match[1].replace(magicEscaper, '$1$1') + match[2];
      } else {
        for (var i = 0; i < serializers.length; i++) {
          var serializer = serializers[i];
          if (serializer.isInstance(value)) {
            if (typeof serializer.replace === 'function') {
              return serializer.replace(value);
            }
            var name;
            if (typeof serializer.name === 'function')
              name = serializer.name(value);
            else
              name = serializer.name;
            var args = serializer.serialize(value);
            if (!isArray(args))
              throw new Error("'serialize' function must return an array " +
                              "containing arguments for 'deserialize'");
              return magic + name + jsonStringify(args);
          }
        }
      }
    }

    function replacer(key, value) {
      var rv = null;

      if (isReplaceable(value)) {
        if (isArray(value)) {
          rv = [];
          value.forEach(function(v) {
            var replacedValue = replaceValue(v);
            if (replacedValue === undefined) replacedValue = v;
            rv.push(replacedValue);
          });
        } else {
          rv = {};
          keys(value).forEach(function(k) {
            var v = value[k];
            var replacedValue = replaceValue(v);
            if (replacedValue === undefined) replacedValue = v;
            rv[k] = replacedValue;
          });
        }
      }

      if (!rv) return value;
      return rv;
    }

    var rv;

    if (typeof userReplacer === 'number') 
      indent = userReplacer;

    if (!userReplacer && isReplaceable(obj))
      rv = replaceValue(obj);

    if (rv) 
      return jsonStringify(rv, null, indent);

    return jsonStringify(obj, typeof userReplacer === 'function' ?
                         userReplacer : replacer, indent);
  }

  function parse(json, userReviver) {
    var revived = [];

    function reviveValue(value) {
      var args, match, name;

      if ((match = superJsonPattern.exec(value))) {
        name = match[1];
        try {
          args = jsonParse(match[2]);
        } catch (e) {
          // Ignore parse errors
          return;
        }
        for (var i = 0; i < serializers.length; i += 1) {
          var serializer = serializers[i];
          if (name === serializer.name)
            return serializer.deserialize.apply(serializer, args);
        }
      } else if ((match = superJsonStringPattern.exec(value))) {
        return match[1].replace(magicUnescaper, '$1') + match[2];
      }
    }

    function reviver(key, value) {
      if (typeof value === 'object' && value && revived.indexOf(value) === -1) {
        keys(value).forEach(function(k) {
          var revivedValue;
          var v = value[k];
          if (typeof v === 'string')
            revivedValue = reviveValue(v);
          if (revivedValue) revived.push(revivedValue);
          else revivedValue = v;
          value[k] = revivedValue;
        });
      }

      return value;
    }

    var rv;
    var parsed = jsonParse(json, typeof userReviver === 'function' ?
                          userReviver : reviver);

    if (typeof parsed === 'string') rv = reviveValue(parsed);
    if (!rv) rv = parsed;
    return rv;
  }

  initialSerializers.forEach(installSerializer);

  return {
    stringify: stringify,
    parse: parse,
    installSerializer: installSerializer
  };
}

exports.dateSerializer = dateSerializer;
exports.regExpSerializer = regExpSerializer;
exports.functionSerializer = functionSerializer;
if (symbolSerializer) exports.symbolSerializer = symbolSerializer;
exports.create = create;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"has":42}],44:[function(require,module,exports){
"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
exports.__esModule = true;
var superJson = require("super-json");
/** Support undefined and Date by default*/
function get(serializers) {
    if (serializers === void 0) { serializers = []; }
    var myJson = superJson.create({
        "magic": '#!',
        "serializers": __spread([
            superJson.dateSerializer
        ], serializers)
    });
    return {
        "stringify": function (obj) {
            if (obj === undefined) {
                return "undefined";
            }
            return myJson.stringify([obj]);
        },
        "parse": function (str) {
            if (str === "undefined") {
                return undefined;
            }
            return myJson.parse(str).pop();
        }
    };
}
exports.get = get;

},{"super-json":43}],45:[function(require,module,exports){
module.exports={
  "usd": {
    "symbol": "$",
    "name": "US Dollar",
    "countriesIso": [
      "bq",
      "tl",
      "gu",
      "sv",
      "pr",
      "pw",
      "ec",
      "mh",
      "mp",
      "io",
      "fm",
      "vg",
      "us",
      "um",
      "tc",
      "vi",
      "as"
    ]
  },
  "cad": {
    "symbol": "CA$",
    "name": "Canadian Dollar",
    "countriesIso": [
      "ca"
    ]
  },
  "eur": {
    "symbol": "€",
    "name": "Euro",
    "countriesIso": [
      "be",
      "bl",
      "re",
      "gr",
      "gp",
      "gf",
      "pt",
      "pm",
      "ee",
      "it",
      "es",
      "me",
      "mf",
      "mc",
      "mt",
      "mq",
      "fr",
      "fi",
      "nl",
      "xk",
      "cy",
      "sk",
      "si",
      "sm",
      "de",
      "yt",
      "lv",
      "lu",
      "tf",
      "va",
      "ad",
      "at",
      "ax",
      "ie"
    ]
  },
  "aed": {
    "symbol": "AED",
    "name": "United Arab Emirates Dirham",
    "countriesIso": [
      "ae"
    ]
  },
  "afn": {
    "symbol": "Af",
    "name": "Afghan Afghani",
    "countriesIso": [
      "af"
    ]
  },
  "all": {
    "symbol": "ALL",
    "name": "Albanian Lek",
    "countriesIso": [
      "al"
    ]
  },
  "amd": {
    "symbol": "AMD",
    "name": "Armenian Dram",
    "countriesIso": [
      "am"
    ]
  },
  "ars": {
    "symbol": "AR$",
    "name": "Argentine Peso",
    "countriesIso": [
      "ar"
    ]
  },
  "aud": {
    "symbol": "AU$",
    "name": "Australian Dollar",
    "countriesIso": [
      "hm",
      "nf",
      "nr",
      "cc",
      "cx",
      "ki",
      "tv",
      "au"
    ]
  },
  "azn": {
    "symbol": "man.",
    "name": "Azerbaijani Manat",
    "countriesIso": [
      "az"
    ]
  },
  "bam": {
    "symbol": "KM",
    "name": "Bosnia-Herzegovina Convertible Mark",
    "countriesIso": [
      "ba"
    ]
  },
  "bdt": {
    "symbol": "Tk",
    "name": "Bangladeshi Taka",
    "countriesIso": [
      "bd"
    ]
  },
  "bgn": {
    "symbol": "BGN",
    "name": "Bulgarian Lev",
    "countriesIso": [
      "bg"
    ]
  },
  "bhd": {
    "symbol": "BD",
    "name": "Bahraini Dinar",
    "countriesIso": [
      "bh"
    ]
  },
  "bif": {
    "symbol": "FBu",
    "name": "Burundian Franc",
    "countriesIso": [
      "bi"
    ]
  },
  "bnd": {
    "symbol": "BN$",
    "name": "Brunei Dollar",
    "countriesIso": [
      "bn"
    ]
  },
  "bob": {
    "symbol": "Bs",
    "name": "Bolivian Boliviano",
    "countriesIso": [
      "bo"
    ]
  },
  "brl": {
    "symbol": "R$",
    "name": "Brazilian Real",
    "countriesIso": [
      "br"
    ]
  },
  "bwp": {
    "symbol": "BWP",
    "name": "Botswanan Pula",
    "countriesIso": [
      "bw"
    ]
  },
  "byr": {
    "symbol": "BYR",
    "name": "Belarusian Ruble",
    "countriesIso": [
      "by"
    ]
  },
  "bzd": {
    "symbol": "BZ$",
    "name": "Belize Dollar",
    "countriesIso": [
      "bz"
    ]
  },
  "cdf": {
    "symbol": "CDF",
    "name": "Congolese Franc",
    "countriesIso": [
      "cd"
    ]
  },
  "chf": {
    "symbol": "CHF",
    "name": "Swiss Franc",
    "countriesIso": [
      "ch",
      "li"
    ]
  },
  "clp": {
    "symbol": "CL$",
    "name": "Chilean Peso",
    "countriesIso": [
      "cl"
    ]
  },
  "cny": {
    "symbol": "CN¥",
    "name": "Chinese Yuan",
    "countriesIso": [
      "cn"
    ]
  },
  "cop": {
    "symbol": "CO$",
    "name": "Colombian Peso",
    "countriesIso": [
      "co"
    ]
  },
  "crc": {
    "symbol": "₡",
    "name": "Costa Rican Colón",
    "countriesIso": [
      "cr"
    ]
  },
  "cve": {
    "symbol": "CV$",
    "name": "Cape Verdean Escudo",
    "countriesIso": [
      "cv"
    ]
  },
  "czk": {
    "symbol": "Kč",
    "name": "Czech Republic Koruna",
    "countriesIso": [
      "cz"
    ]
  },
  "djf": {
    "symbol": "Fdj",
    "name": "Djiboutian Franc",
    "countriesIso": [
      "dj"
    ]
  },
  "dkk": {
    "symbol": "Dkr",
    "name": "Danish Krone",
    "countriesIso": [
      "gl",
      "fo",
      "dk"
    ]
  },
  "dop": {
    "symbol": "RD$",
    "name": "Dominican Peso",
    "countriesIso": [
      "do"
    ]
  },
  "dzd": {
    "symbol": "DA",
    "name": "Algerian Dinar",
    "countriesIso": [
      "dz"
    ]
  },
  "eek": {
    "symbol": "Ekr",
    "name": "Estonian Kroon",
    "countriesIso": []
  },
  "egp": {
    "symbol": "EGP",
    "name": "Egyptian Pound",
    "countriesIso": [
      "eg"
    ]
  },
  "ern": {
    "symbol": "Nfk",
    "name": "Eritrean Nakfa",
    "countriesIso": [
      "er"
    ]
  },
  "etb": {
    "symbol": "Br",
    "name": "Ethiopian Birr",
    "countriesIso": [
      "et"
    ]
  },
  "gbp": {
    "symbol": "£",
    "name": "British Pound Sterling",
    "countriesIso": [
      "je",
      "gs",
      "gg",
      "gb",
      "im"
    ]
  },
  "gel": {
    "symbol": "GEL",
    "name": "Georgian Lari",
    "countriesIso": [
      "ge"
    ]
  },
  "ghs": {
    "symbol": "GH₵",
    "name": "Ghanaian Cedi",
    "countriesIso": [
      "gh"
    ]
  },
  "gnf": {
    "symbol": "FG",
    "name": "Guinean Franc",
    "countriesIso": [
      "gn"
    ]
  },
  "gtq": {
    "symbol": "GTQ",
    "name": "Guatemalan Quetzal",
    "countriesIso": [
      "gt"
    ]
  },
  "hkd": {
    "symbol": "HK$",
    "name": "Hong Kong Dollar",
    "countriesIso": [
      "hk"
    ]
  },
  "hnl": {
    "symbol": "HNL",
    "name": "Honduran Lempira",
    "countriesIso": [
      "hn"
    ]
  },
  "hrk": {
    "symbol": "kn",
    "name": "Croatian Kuna",
    "countriesIso": [
      "hr"
    ]
  },
  "huf": {
    "symbol": "Ft",
    "name": "Hungarian Forint",
    "countriesIso": [
      "hu"
    ]
  },
  "idr": {
    "symbol": "Rp",
    "name": "Indonesian Rupiah",
    "countriesIso": [
      "id"
    ]
  },
  "ils": {
    "symbol": "₪",
    "name": "Israeli New Sheqel",
    "countriesIso": [
      "ps",
      "il"
    ]
  },
  "inr": {
    "symbol": "Rs",
    "name": "Indian Rupee",
    "countriesIso": [
      "in"
    ]
  },
  "iqd": {
    "symbol": "IQD",
    "name": "Iraqi Dinar",
    "countriesIso": [
      "iq"
    ]
  },
  "irr": {
    "symbol": "IRR",
    "name": "Iranian Rial",
    "countriesIso": [
      "ir"
    ]
  },
  "isk": {
    "symbol": "Ikr",
    "name": "Icelandic Króna",
    "countriesIso": [
      "is"
    ]
  },
  "jmd": {
    "symbol": "J$",
    "name": "Jamaican Dollar",
    "countriesIso": [
      "jm"
    ]
  },
  "jod": {
    "symbol": "JD",
    "name": "Jordanian Dinar",
    "countriesIso": [
      "jo"
    ]
  },
  "jpy": {
    "symbol": "¥",
    "name": "Japanese Yen",
    "countriesIso": [
      "jp"
    ]
  },
  "kes": {
    "symbol": "Ksh",
    "name": "Kenyan Shilling",
    "countriesIso": [
      "ke"
    ]
  },
  "khr": {
    "symbol": "KHR",
    "name": "Cambodian Riel",
    "countriesIso": [
      "kh"
    ]
  },
  "kmf": {
    "symbol": "CF",
    "name": "Comorian Franc",
    "countriesIso": [
      "km"
    ]
  },
  "krw": {
    "symbol": "₩",
    "name": "South Korean Won",
    "countriesIso": [
      "kr"
    ]
  },
  "kwd": {
    "symbol": "KD",
    "name": "Kuwaiti Dinar",
    "countriesIso": [
      "kw"
    ]
  },
  "kzt": {
    "symbol": "KZT",
    "name": "Kazakhstani Tenge",
    "countriesIso": [
      "kz"
    ]
  },
  "lbp": {
    "symbol": "LB£",
    "name": "Lebanese Pound",
    "countriesIso": [
      "lb"
    ]
  },
  "lkr": {
    "symbol": "SLRs",
    "name": "Sri Lankan Rupee",
    "countriesIso": [
      "lk"
    ]
  },
  "ltl": {
    "symbol": "Lt",
    "name": "Lithuanian Litas",
    "countriesIso": [
      "lt"
    ]
  },
  "lvl": {
    "symbol": "Ls",
    "name": "Latvian Lats",
    "countriesIso": []
  },
  "lyd": {
    "symbol": "LD",
    "name": "Libyan Dinar",
    "countriesIso": [
      "ly"
    ]
  },
  "mad": {
    "symbol": "MAD",
    "name": "Moroccan Dirham",
    "countriesIso": [
      "eh",
      "ma"
    ]
  },
  "mdl": {
    "symbol": "MDL",
    "name": "Moldovan Leu",
    "countriesIso": [
      "md"
    ]
  },
  "mga": {
    "symbol": "MGA",
    "name": "Malagasy Ariary",
    "countriesIso": [
      "mg"
    ]
  },
  "mkd": {
    "symbol": "MKD",
    "name": "Macedonian Denar",
    "countriesIso": [
      "mk"
    ]
  },
  "mmk": {
    "symbol": "MMK",
    "name": "Myanma Kyat",
    "countriesIso": [
      "mm"
    ]
  },
  "mop": {
    "symbol": "MOP$",
    "name": "Macanese Pataca",
    "countriesIso": [
      "mo"
    ]
  },
  "mur": {
    "symbol": "MURs",
    "name": "Mauritian Rupee",
    "countriesIso": [
      "mu"
    ]
  },
  "mxn": {
    "symbol": "MX$",
    "name": "Mexican Peso",
    "countriesIso": [
      "mx"
    ]
  },
  "myr": {
    "symbol": "RM",
    "name": "Malaysian Ringgit",
    "countriesIso": [
      "my"
    ]
  },
  "mzn": {
    "symbol": "MTn",
    "name": "Mozambican Metical",
    "countriesIso": [
      "mz"
    ]
  },
  "nad": {
    "symbol": "N$",
    "name": "Namibian Dollar",
    "countriesIso": [
      "na"
    ]
  },
  "ngn": {
    "symbol": "₦",
    "name": "Nigerian Naira",
    "countriesIso": [
      "ng"
    ]
  },
  "nio": {
    "symbol": "C$",
    "name": "Nicaraguan Córdoba",
    "countriesIso": [
      "ni"
    ]
  },
  "nok": {
    "symbol": "Nkr",
    "name": "Norwegian Krone",
    "countriesIso": [
      "bv",
      "sj",
      "no"
    ]
  },
  "npr": {
    "symbol": "NPRs",
    "name": "Nepalese Rupee",
    "countriesIso": [
      "np"
    ]
  },
  "nzd": {
    "symbol": "NZ$",
    "name": "New Zealand Dollar",
    "countriesIso": [
      "tk",
      "pn",
      "nz",
      "nu",
      "ck"
    ]
  },
  "omr": {
    "symbol": "OMR",
    "name": "Omani Rial",
    "countriesIso": [
      "om"
    ]
  },
  "pab": {
    "symbol": "B/.",
    "name": "Panamanian Balboa",
    "countriesIso": [
      "pa"
    ]
  },
  "pen": {
    "symbol": "S/.",
    "name": "Peruvian Nuevo Sol",
    "countriesIso": [
      "pe"
    ]
  },
  "php": {
    "symbol": "₱",
    "name": "Philippine Peso",
    "countriesIso": [
      "ph"
    ]
  },
  "pkr": {
    "symbol": "PKRs",
    "name": "Pakistani Rupee",
    "countriesIso": [
      "pk"
    ]
  },
  "pln": {
    "symbol": "zł",
    "name": "Polish Zloty",
    "countriesIso": [
      "pl"
    ]
  },
  "pyg": {
    "symbol": "₲",
    "name": "Paraguayan Guarani",
    "countriesIso": [
      "py"
    ]
  },
  "qar": {
    "symbol": "QR",
    "name": "Qatari Rial",
    "countriesIso": [
      "qa"
    ]
  },
  "ron": {
    "symbol": "RON",
    "name": "Romanian Leu",
    "countriesIso": [
      "ro"
    ]
  },
  "rsd": {
    "symbol": "din.",
    "name": "Serbian Dinar",
    "countriesIso": [
      "rs"
    ]
  },
  "rub": {
    "symbol": "RUB",
    "name": "Russian Ruble",
    "countriesIso": [
      "ru"
    ]
  },
  "rwf": {
    "symbol": "RWF",
    "name": "Rwandan Franc",
    "countriesIso": [
      "rw"
    ]
  },
  "sar": {
    "symbol": "SR",
    "name": "Saudi Riyal",
    "countriesIso": [
      "sa"
    ]
  },
  "sdg": {
    "symbol": "SDG",
    "name": "Sudanese Pound",
    "countriesIso": [
      "sd"
    ]
  },
  "sek": {
    "symbol": "Skr",
    "name": "Swedish Krona",
    "countriesIso": [
      "se"
    ]
  },
  "sgd": {
    "symbol": "S$",
    "name": "Singapore Dollar",
    "countriesIso": [
      "sg"
    ]
  },
  "sos": {
    "symbol": "Ssh",
    "name": "Somali Shilling",
    "countriesIso": [
      "so"
    ]
  },
  "syp": {
    "symbol": "SY£",
    "name": "Syrian Pound",
    "countriesIso": [
      "sy"
    ]
  },
  "thb": {
    "symbol": "฿",
    "name": "Thai Baht",
    "countriesIso": [
      "th"
    ]
  },
  "tnd": {
    "symbol": "DT",
    "name": "Tunisian Dinar",
    "countriesIso": [
      "tn"
    ]
  },
  "top": {
    "symbol": "T$",
    "name": "Tongan Paʻanga",
    "countriesIso": [
      "to"
    ]
  },
  "try": {
    "symbol": "TL",
    "name": "Turkish Lira",
    "countriesIso": [
      "tr"
    ]
  },
  "ttd": {
    "symbol": "TT$",
    "name": "Trinidad and Tobago Dollar",
    "countriesIso": [
      "tt"
    ]
  },
  "twd": {
    "symbol": "NT$",
    "name": "New Taiwan Dollar",
    "countriesIso": [
      "tw"
    ]
  },
  "tzs": {
    "symbol": "TSh",
    "name": "Tanzanian Shilling",
    "countriesIso": [
      "tz"
    ]
  },
  "uah": {
    "symbol": "₴",
    "name": "Ukrainian Hryvnia",
    "countriesIso": [
      "ua"
    ]
  },
  "ugx": {
    "symbol": "USh",
    "name": "Ugandan Shilling",
    "countriesIso": [
      "ug"
    ]
  },
  "uyu": {
    "symbol": "$U",
    "name": "Uruguayan Peso",
    "countriesIso": [
      "uy"
    ]
  },
  "uzs": {
    "symbol": "UZS",
    "name": "Uzbekistan Som",
    "countriesIso": [
      "uz"
    ]
  },
  "vef": {
    "symbol": "Bs.F.",
    "name": "Venezuelan Bolívar",
    "countriesIso": [
      "ve"
    ]
  },
  "vnd": {
    "symbol": "₫",
    "name": "Vietnamese Dong",
    "countriesIso": [
      "vn"
    ]
  },
  "xaf": {
    "symbol": "FCFA",
    "name": "CFA Franc BEAC",
    "countriesIso": [
      "gq",
      "ga",
      "cm",
      "cg",
      "cf",
      "td"
    ]
  },
  "xof": {
    "symbol": "CFA",
    "name": "CFA Franc BCEAO",
    "countriesIso": [
      "bf",
      "bj",
      "gw",
      "ml",
      "ne",
      "ci",
      "sn",
      "tg"
    ]
  },
  "yer": {
    "symbol": "YR",
    "name": "Yemeni Rial",
    "countriesIso": [
      "ye"
    ]
  },
  "zar": {
    "symbol": "R",
    "name": "South African Rand",
    "countriesIso": [
      "za"
    ]
  },
  "zmk": {
    "symbol": "ZK",
    "name": "Zambian Kwacha",
    "countriesIso": [
      "zm"
    ]
  }
}

},{}],46:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiPath = "/api";
var version;
(function (version) {
    version.methodName = "version";
})(version = exports.version || (exports.version = {}));

},{}]},{},[7]);
