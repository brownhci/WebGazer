### Localized build

This script downloads the TFJS models from Kaggle and replaces the URLs in the installed npm packages with local
paths. Please note that it is currently a hacky workaround. You will need to make sure the local_models folder also exists wherever the built webgazer.js exists.


To compile WebGazer for local use, first read and verify `localize_build.sh`, then

`chmod +x ./scripts/localize_build.sh`

then run

`npm run localbuild`
