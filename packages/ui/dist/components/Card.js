"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = Card;
exports.CardHeader = CardHeader;
exports.CardTitle = CardTitle;
exports.CardContent = CardContent;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../utils/cn");
function Card({ children, className, id, onClick }) {
    return ((0, jsx_runtime_1.jsx)("div", { id: id, onClick: onClick, className: (0, cn_1.cn)("bg-white border border-neutral-200 overflow-hidden", className), children: children }));
}
function CardHeader({ children, className }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)("px-6 py-4 border-b border-neutral-100 bg-neutral-50/30", className), children: children }));
}
function CardTitle({ children, className }) {
    return ((0, jsx_runtime_1.jsx)("h3", { className: (0, cn_1.cn)("font-bold text-neutral-900 tracking-tight", className), children: children }));
}
function CardContent({ children, className }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)("px-6 py-4", className), children: children }));
}
//# sourceMappingURL=Card.js.map