npx esbuild web/js/editor.js --bundle --platform=browser --format=esm --outfile=dist/app.js --minify
if [ $? -ne 0 ]; then
    read
fi