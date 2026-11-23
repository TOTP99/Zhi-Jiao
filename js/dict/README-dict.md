# 御猫灵局 离线英文字典

## 翻译进度（2026-11-23）

| 文件 | 条数 | 已译 | 状态 |
|------|------|------|------|
| `dict-tarot.js` | 74 | 74 | ✅ 完成 |
| `dict-ziwei.js` | 112 | 112 | ✅ 完成 |
| `dict-wuge.js` | 271 | 271 | ✅ 完成 |
| `dict-zodiac.js` | 241 | 241 | ✅ 完成 |
| `dict-jiao.js` | 610 | 198 | 🔄 部分（约 32%） |
| `dict-yijing.js` | 2866 | 0 | ⏳ 待译 |
| `dict-bazi.js` | 259 | 0 | ⏳ 待译 |
| `dict-palm.js` | 314 | 0 | ⏳ 待译 |
| `dict-mbti.js` | 288 | 0 | ⏳ 待译 |
| `dict-misc.js` | 799 | 0 | ⏳ 待译 |

**已译约 896 条 · 待译约 4938 条**

未填英文的条目 value 为 `""`。`t()` 会自动回中文，可直接接入使用。

## 文件

```
js/dict/dict-*.js × 10
js/dict/i18n-hook-example.js
js/dict/README-dict.md
js/yumiao-i18n.js
```

## 引入

```html
<script src="js/dict/dict-jiao.js"></script>
<script src="js/dict/dict-yijing.js"></script>
<script src="js/dict/dict-bazi.js"></script>
<script src="js/dict/dict-palm.js"></script>
<script src="js/dict/dict-zodiac.js"></script>
<script src="js/dict/dict-tarot.js"></script>
<script src="js/dict/dict-ziwei.js"></script>
<script src="js/dict/dict-wuge.js"></script>
<script src="js/dict/dict-mbti.js"></script>
<script src="js/dict/dict-misc.js"></script>
<script src="js/yumiao-i18n.js"></script>
```

## 约定

1. 只翻正文：`t(中文)` / `tContent(中文)`
2. 标题/按钮保持中文，不包 t()
3. 临时英文视图：`enterEnglishView()` / `bindClickAnywhereToRestore()`
4. 结果重绘：见 `i18n-hook-example.js`

## 兜底

字典缺失 / 英文为空 / 异常 → 一律回中文，不空白、不抛错。
