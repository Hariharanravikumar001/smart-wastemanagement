"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var playwright_1 = require("playwright");
function testRole(baseUrl, roleStr, routes, emailPrefix) {
    return __awaiter(this, void 0, void 0, function () {
        var email, password, name, errors, browser, context, page, roleSelect, options, match, routes_1, routes_1_1, route, e_1_1, err_1;
        var e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    email = "".concat(emailPrefix, "_").concat(Date.now(), "@test.com");
                    password = 'Password@123';
                    name = "Test ".concat(roleStr);
                    errors = [];
                    return [4 /*yield*/, playwright_1.chromium.launch({ headless: true })];
                case 1:
                    browser = _b.sent();
                    return [4 /*yield*/, browser.newContext()];
                case 2:
                    context = _b.sent();
                    return [4 /*yield*/, context.newPage()];
                case 3:
                    page = _b.sent();
                    // Capture all console errors and uncaught exceptions
                    page.on('console', function (msg) {
                        if (msg.type() === 'error') {
                            errors.push("[".concat(roleStr, "] Console Error: ").concat(msg.text()));
                        }
                    });
                    page.on('pageerror', function (exception) {
                        errors.push("[".concat(roleStr, "] Uncaught Exception: ").concat(exception.message));
                    });
                    page.on('response', function (resp) {
                        if (resp.status() >= 400 && !resp.url().includes('favicon')) {
                            errors.push("[".concat(roleStr, "] Network Error: ").concat(resp.status(), " on ").concat(resp.url()));
                        }
                    });
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 36, 37, 39]);
                    console.log("\n--- Testing ".concat(roleStr, " ---"));
                    console.log('Registering...');
                    return [4 /*yield*/, page.goto("".concat(baseUrl, "/register"))];
                case 5:
                    _b.sent();
                    return [4 /*yield*/, page.waitForLoadState('load')];
                case 6:
                    _b.sent();
                    // Fill register form
                    return [4 /*yield*/, page.fill('input[name="name"]', name).catch(function () { })];
                case 7:
                    // Fill register form
                    _b.sent();
                    return [4 /*yield*/, page.fill('input[name="username"]', name.toLowerCase().replace(' ', '')).catch(function () { })];
                case 8:
                    _b.sent();
                    return [4 /*yield*/, page.fill('input[name="email"]', email)];
                case 9:
                    _b.sent();
                    return [4 /*yield*/, page.fill('input[name="password"]', password)];
                case 10:
                    _b.sent();
                    return [4 /*yield*/, page.fill('input[name="confirmPassword"]', password).catch(function () { })];
                case 11:
                    _b.sent();
                    return [4 /*yield*/, page.fill('input[name="location"]', '123 Test St').catch(function () { })];
                case 12:
                    _b.sent();
                    return [4 /*yield*/, page.$('select')];
                case 13:
                    roleSelect = _b.sent();
                    if (!roleSelect) return [3 /*break*/, 16];
                    return [4 /*yield*/, page.$$eval('select option', function (opts) {
                            return opts.map(function (o) { return ({ v: o.value, t: o.textContent || '' }); });
                        })];
                case 14:
                    options = _b.sent();
                    match = options.find(function (o) {
                        return o.t.toLowerCase().includes(roleStr.toLowerCase()) ||
                            o.v.toLowerCase().includes(roleStr.toLowerCase());
                    });
                    if (!match) return [3 /*break*/, 16];
                    return [4 /*yield*/, page.selectOption('select', match.v)];
                case 15:
                    _b.sent();
                    _b.label = 16;
                case 16: 
                // Check terms
                return [4 /*yield*/, page.check('input[name="terms"]').catch(function () { })];
                case 17:
                    // Check terms
                    _b.sent();
                    return [4 /*yield*/, page.click('button[type="submit"]')];
                case 18:
                    _b.sent();
                    return [4 /*yield*/, page.waitForTimeout(3000)];
                case 19:
                    _b.sent(); // wait for redirect
                    console.log("Logging in as ".concat(email, "..."));
                    // Wait for the login page to appear
                    return [4 /*yield*/, page.goto("".concat(baseUrl, "/login"))];
                case 20:
                    // Wait for the login page to appear
                    _b.sent();
                    return [4 /*yield*/, page.waitForLoadState('load')];
                case 21:
                    _b.sent();
                    return [4 /*yield*/, page.fill('input[type="email"]', email)];
                case 22:
                    _b.sent();
                    return [4 /*yield*/, page.fill('input[type="password"]', password)];
                case 23:
                    _b.sent();
                    return [4 /*yield*/, page.click('button[type="submit"]')];
                case 24:
                    _b.sent();
                    // Wait for login success
                    return [4 /*yield*/, page.waitForTimeout(3000)];
                case 25:
                    // Wait for login success
                    _b.sent();
                    _b.label = 26;
                case 26:
                    _b.trys.push([26, 33, 34, 35]);
                    routes_1 = __values(routes), routes_1_1 = routes_1.next();
                    _b.label = 27;
                case 27:
                    if (!!routes_1_1.done) return [3 /*break*/, 32];
                    route = routes_1_1.value;
                    console.log("Visiting ".concat(route, "..."));
                    return [4 /*yield*/, page.goto("".concat(baseUrl).concat(route))];
                case 28:
                    _b.sent();
                    return [4 /*yield*/, page.waitForLoadState('load')];
                case 29:
                    _b.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 30:
                    _b.sent(); // Allow render and backend requests
                    _b.label = 31;
                case 31:
                    routes_1_1 = routes_1.next();
                    return [3 /*break*/, 27];
                case 32: return [3 /*break*/, 35];
                case 33:
                    e_1_1 = _b.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 35];
                case 34:
                    try {
                        if (routes_1_1 && !routes_1_1.done && (_a = routes_1.return)) _a.call(routes_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 35: return [3 /*break*/, 39];
                case 36:
                    err_1 = _b.sent();
                    errors.push("[".concat(roleStr, "] Execution Error: ").concat(err_1.message));
                    return [3 /*break*/, 39];
                case 37: return [4 /*yield*/, browser.close()];
                case 38:
                    _b.sent();
                    return [7 /*endfinally*/];
                case 39: return [2 /*return*/, errors];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var baseUrl, allErrors, citizenRoutes, volunteerRoutes, adminRoutes, citErrs, volErrs, admErrs, uniqueErrors;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    baseUrl = 'http://localhost:4200';
                    allErrors = [];
                    citizenRoutes = [
                        '/citizen/dashboard',
                        '/citizen/pickup-request',
                        '/citizen/pickup-history',
                        '/citizen/statistics',
                        '/citizen/messages',
                        '/citizen/profile'
                    ];
                    volunteerRoutes = [
                        '/volunteer/dashboard',
                        '/volunteer/opportunities',
                        '/volunteer/my-pickups',
                        '/volunteer/messages',
                        '/volunteer/profile'
                    ];
                    adminRoutes = [
                        '/admin',
                        '/messages',
                        '/opportunities'
                    ];
                    console.log('Starting Playwright E2E Dashboards Test in TypeScript...');
                    return [4 /*yield*/, testRole(baseUrl, 'Citizen', citizenRoutes, 'cit')];
                case 1:
                    citErrs = _a.sent();
                    allErrors.push.apply(allErrors, __spreadArray([], __read(citErrs), false));
                    return [4 /*yield*/, testRole(baseUrl, 'Volunteer', volunteerRoutes, 'vol')];
                case 2:
                    volErrs = _a.sent();
                    allErrors.push.apply(allErrors, __spreadArray([], __read(volErrs), false));
                    return [4 /*yield*/, testRole(baseUrl, 'NGO', adminRoutes, 'adm')];
                case 3:
                    admErrs = _a.sent();
                    allErrors.push.apply(allErrors, __spreadArray([], __read(admErrs), false));
                    console.log('\n================ RESULTS ================');
                    if (allErrors.length === 0) {
                        console.log('✅ No errors found across all dashboards!');
                    }
                    else {
                        console.log("\u274C Found ".concat(allErrors.length, " errors:"));
                        uniqueErrors = __spreadArray([], __read(new Set(allErrors)), false);
                        uniqueErrors.forEach(function (e) { return console.log(e); });
                    }
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error);
