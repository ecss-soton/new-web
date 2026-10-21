# Self-hosted fonts

These files are the Latin-subset `.woff2` files served by Google Fonts. They are
committed here so `next build` never has to call `fonts.googleapis.com` /
`fonts.gstatic.com`.

Why: `next/font/google` fetches the font stylesheet during the build. Google
sometimes returns extensionless `https://fonts.gstatic.com/l/font?kit=...` URLs,
which the Google loader in Next 14.2 cannot parse — it crashes with
`TypeError: Cannot read properties of null (reading '1')` and fails the build
intermittently. Using `next/font/local` (see `../font.ts`) removes that
dependency.

## Files

| File | Family | Weights / styles | Source | Licence |
| --- | --- | --- | --- | --- |
| `inter.woff2` | Inter | variable 100–900, normal | https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2 | SIL OFL 1.1 |
| `newsreader.woff2` | Newsreader | variable 200–800, normal | https://fonts.gstatic.com/s/newsreader/v26/cY9AfjOCX1hbuyalUrK4397yjIJFJpc.woff2 | SIL OFL 1.1 |
| `newsreader-italic.woff2` | Newsreader | variable 200–800, italic | https://fonts.gstatic.com/s/newsreader/v26/cY9CfjOCX1hbuyalUrK439vCjohCBJWxZA.woff2 | SIL OFL 1.1 |
| `spectral-400.woff2` | Spectral | 400 normal | https://fonts.gstatic.com/s/spectral/v15/rnCr-xNNww_2s0amA9M5knjsS_ul.woff2 | SIL OFL 1.1 |
| `spectral-600.woff2` | Spectral | 600 normal | https://fonts.gstatic.com/s/spectral/v15/rnCs-xNNww_2s0amA9vmtm3BafaPWnII.woff2 | SIL OFL 1.1 |
| `spectral-400-italic.woff2` | Spectral | 400 italic | https://fonts.gstatic.com/s/spectral/v15/rnCt-xNNww_2s0amA9M8onrmTNmnUHo.woff2 | SIL OFL 1.1 |
| `spectral-600-italic.woff2` | Spectral | 600 italic | https://fonts.gstatic.com/s/spectral/v15/rnCu-xNNww_2s0amA9M8qqXCWfSFXVAKArc.woff2 | SIL OFL 1.1 |
| `permanent-marker-400.woff2` | Permanent Marker | 400 normal | https://fonts.gstatic.com/s/permanentmarker/v16/Fh4uPib9Iyv2ucM6pGQMWimMp004La2Cf5b6jlg.woff2 | Apache 2.0 |
| `bungee-400.woff2` | Bungee | 400 normal | https://fonts.gstatic.com/s/bungee/v17/N0bU2SZBIuF2PU_0DXR1C9zfmQ.woff2 | SIL OFL 1.1 |
| `rubik-mono-one-400.woff2` | Rubik Mono One | 400 normal | https://fonts.gstatic.com/s/rubikmonoone/v20/UqyJK8kPP3hjw6ANTdfRk9YSN983TKUJcOj8.woff2 | SIL OFL 1.1 |
| `poppins-400.woff2` | Poppins | 400 normal | https://fonts.gstatic.com/s/poppins/v24/pxiEyp8kv8JHgFVrJJfecnFHGPc.woff2 | SIL OFL 1.1 |
| `poppins-700.woff2` | Poppins | 700 normal | https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLCz7Z1xlFd2JQEk.woff2 | SIL OFL 1.1 |

Downloaded from Google Fonts on 2026-10-21. Licence texts are available from
https://fonts.google.com/ (each family page links to its OFL/Apache licence).

## Updating

The URLs above are the ones Next would otherwise use. To refresh a file, request
the matching family from the Google Fonts CSS2 API with a modern browser user
agent, take the `/* latin */` block, and replace the corresponding file:

```bash
curl -sS \
  -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36' \
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap'
```

Only the Latin subset is vendored; Cyrillic/Greek/Vietnamese/latin-ext glyphs
fall back to the system fonts. Add those files to the `src` arrays in
`../font.ts` if wider coverage is needed.
