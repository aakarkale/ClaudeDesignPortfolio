# Project conventions

## Analytics snippets — required on every HTML page

Whenever a new HTML page is added to this project, the `<head>` MUST include
all three of the following analytics snippets. Add them automatically — the
user does not need to be asked or reminded.

Order inside `<head>`:

1. **Google tag (gtag.js)** — placed immediately after the opening `<head>` tag:
   ```html
   <!-- Google tag (gtag.js) -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-GKL17QNBEL"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());

     gtag('config', 'G-GKL17QNBEL');
   </script>
   ```

2. **Umami Cloud** — placed after the stylesheet links:
   ```html
   <!-- Umami Cloud analytics -->
   <script defer src="https://cloud.umami.is/script.js" data-website-id="b2dbc135-99e0-4d6f-9295-7d4983e06d13"></script>
   ```

3. **Microsoft Clarity** — placed right after the Umami snippet:
   ```html
   <!-- Microsoft Clarity -->
   <script type="text/javascript">
       (function(c,l,a,r,i,t,y){
           c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
           t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
           y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
       })(window, document, "clarity", "script", "wysdtrb9d5");
   </script>
   ```

The canonical reference implementation is `index.html`. When adding new pages,
mirror its head structure.

## Deploy

GitHub Pages deploy runs from `.github/workflows/deploy.yml` on every push to
`main`. The workflow copies `index.html`, `css/`, `dist/`, `papers/`, and
`assets/` into `_site/`. If a new top-level directory is added that needs to
ship to Pages, update the workflow's "Stage site files" step.
