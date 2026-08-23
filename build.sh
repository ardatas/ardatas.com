#!/bin/bash

set -m

fail() {
    echo "Build failed"
    exit 1
}

tw() {
    echo "Building Tailwind CSS to dist/index.css"
    pnpm tailwindcss -i ./src/index.css -o ./dist/index.css --minify || fail
}

html() {
    echo "Building HTML files to dist"
    uv run python src/build.py --output dist --no-clean || fail
}

static() {
    local assets=(
        blockchain.svg
        experience.svg
        fundraising.svg
        linux-hpc.svg
        logo-github.svg
        logo-linkedin.svg
        logo-tbc.png
        logo-tum.png
        logo-werkio.png
        logo-zarm.png
        portfolio-systems.svg
        projects.svg
        toolkit.svg
        tum-cs.svg
        werkio.svg
        workshops.svg
    )

    mkdir -p dist/assets || fail

    for asset in "${assets[@]}"; do
        echo "Copying public/assets/$asset to dist/assets/$asset"
        cp "public/assets/$asset" "dist/assets/$asset" || fail
    done

    echo "Copying public/favicon.svg to dist/favicon.svg"
    cp public/favicon.svg dist/favicon.svg || fail

    echo "Copying public/robots.txt to dist/robots.txt"
    cp public/robots.txt dist/robots.txt || fail

    echo "Copying public/link-conversion.js to dist/link-conversion.js"
    cp public/link-conversion.js dist/link-conversion.js || fail
}

opt_imgs() {
    # ./src/optimize-images.sh || fail
    uv run python src/optimize_images.py || fail
}

my_wait() {
    local failed=0
    local pids=("$@")

    # If no PIDs are provided, get all background job PIDs
    if [ ${#pids[@]} -eq 0 ]; then
        pids=($(jobs -p))
    fi

    for pid in "${pids[@]}"; do
        wait "$pid"
        if [ $? -ne 0 ]; then
            failed=1
        fi
    done

    if [ $failed -eq 1 ]; then
        fail
    fi
}

html_static() {
    html &
    hpid=$!

    static &
    spid=$!

    my_wait $hpid $spid

    opt_imgs &
    opid=$!

    my_wait $opid
}

rm -rf dist && mkdir dist

tw &
html_static &

my_wait
