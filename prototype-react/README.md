# donotfraud.ai — React prototype

An isolated React + TypeScript evidence-led identity verification concept for the Swiss AI Weeks 2026 Swisscom fraud challenge.

## Run
```bash
cd prototype-react
npm install
npm run dev
```
Run `npm run build` to type-check and build.

## Demonstration
Choose one of three reproducible synthetic scenarios: sufficient evidence, inconclusive capture, or suspicious presentation. Navigate document selection and simulated captures, see the adaptive decision, complete a simulated NFC or facial challenge, then inspect signals and record a decision in the analyst dashboard. A case can be restarted. Audit actions are stored in localStorage.

This stand-alone implementation is kept separate from the repository's existing applications. All identity, capture, NFC, liveness, and device checks are synthetic; no camera, biometrics, or identity information is collected. This is not production fraud prevention or QeS compliance.

The original fuller prototype and its 24 screenshot-reference PNGs remain in the chat download; the GitHub branch contains a compact standalone React implementation without the binary reference images.
