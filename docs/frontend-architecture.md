# Frontend Architecture

This document outlines the planned pages and rendering strategy for the web storefront and admin portal.

## Rendering Strategy

- **SEO critical pages** such as the home page, category listings, product details and promotional pages are server rendered. Use SSR/SSG or incremental static regeneration so that crawlers can index them efficiently.
- **User specific pages** including the cart, order centre and personal account use client side rendering. These views require user authentication and do not need to be indexed.

## Storefront Pages

1. **Home** – top navigation with categories, search bar and language/currency switcher. Includes banner content from the CMS, featured categories, popular items, flash sales and AI driven recommendations.
2. **Category/Collection** – available at `/category/[slug]`. Supports facet filters, sorting and pagination. Filter state is stored in the URL so links can be shared.
3. **Search Results** – `/search?q=` displays suggestions, keyword highlighting, spelling corrections and the same facet filters as the category page. Show alternative terms when no results are found.
4. **Product Detail** – `/product/[slug or id]` shows the product gallery (images and video), pricing and promotions, stock status, specification options, reviews and Q&A. Structured data markup should include price and availability for SEO. Adding to cart opens a mini cart drawer.
5. **Cart** – `/cart` lets the shopper modify quantities, remove items, apply coupons and estimate shipping. Cart contents persist locally and sync to the server when the user logs in.
6. **Checkout** – steps for address, shipping method, payment and order review. Preserve entered data between steps via URL state or local storage so a refresh does not lose progress.
7. **Payment Result** – `/order/success` or `/order/fail` shows the order summary and next steps. Failed payments can be retried.
8. **Order Center** – `/account/orders` lists past orders with filtering by status. Each order detail page provides tracking info, invoices and links to submit reviews or request returns.
9. **Account** – manage profile details, address book, coupons, wishlist, points balance and security settings like password changes or two factor authentication.
10. **Content and Other Pages** – blog articles, campaigns from the CMS, help centre and policy pages. Also includes login, registration and password recovery flows. Internationalisation covers language, currency and units.

## Admin Portal

The backoffice runs as a separate React application. Key screens include:

- **Dashboard** showing GMV, order volume, conversion rates and inventory alerts.
- **Product Management** for CRUD operations, SKU configuration and bulk import/export with scheduled publishing.
- **Inventory** tools to adjust stock levels and set alert thresholds.
- **Order Management** to view orders, change status, handle fulfilment and process returns.
- **User Management** with segmentation, banning and manual adjustments to balance or points.
- **Promotion Management** for coupons and campaigns with rule editors and statistics.
- **Content Management** to manage banners, landing pages and articles.
- **Review Moderation** for approving or rejecting user generated content.
- **Logs and Audit** to inspect security and operational events.
- **Configuration and Permissions** for feature flags, copy updates and RBAC role management.
