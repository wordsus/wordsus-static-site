# Core Design Principles

Great web design isn't about making things look pretty — it's about communicating effectively and guiding users through an intuitive experience. In this chapter, we'll explore the fundamental principles that separate good design from great design.

## 1. Visual Hierarchy

Visual hierarchy guides the user's eye through the content in order of importance.

- **Size**: Larger elements draw attention first
- **Color**: High-contrast elements stand out
- **Weight**: Bold text signals importance
- **Whitespace**: Spacing creates breathing room and separates sections

```css
/* Example: establishing hierarchy with typography */
h1 { font-size: 3rem; font-weight: 700; }
h2 { font-size: 2rem; font-weight: 600; }
h3 { font-size: 1.5rem; font-weight: 500; }
p  { font-size: 1rem;  font-weight: 400; }
```

## 2. Alignment

Everything should be aligned to something. Misalignment creates visual noise and feels unprofessional.

Use a **grid system** to maintain consistent alignment:

```css
.container {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}
```

## 3. Contrast

Sufficient contrast is critical for readability and accessibility. The WCAG standard recommends:

- **Normal text**: minimum contrast ratio of **4.5:1**
- **Large text** (18pt+): minimum contrast ratio of **3:1**

## 4. Repetition (Consistency)

Repeat visual elements to create a unified design. This means:

- Consistent button styles
- Consistent spacing values (use a scale like 4px, 8px, 16px, 32px)
- Consistent font choices (2-3 fonts maximum)

## 5. Proximity

Group related items together, and separate unrelated items:

```css
/* Bad: everything equally spaced */
.card > * { margin: 16px; }

/* Good: group related content */
.card-header { margin-bottom: 8px; }
.card-body   { margin-top: 0; }
.card-footer { margin-top: 24px; }
```

## Summary

The five core principles of web design are:

1. **Visual Hierarchy** — guide the eye
2. **Alignment** — use a grid
3. **Contrast** — ensure readability
4. **Repetition** — be consistent
5. **Proximity** — group related items

In the next chapter, we'll dive into **Color Theory** for web design.
