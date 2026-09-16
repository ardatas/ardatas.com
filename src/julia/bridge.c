#include "vendor/julia.h"
#include <limits.h>
#include <math.h>
#include <stdint.h>
#include <stdlib.h>

/* The renderer only needs this helper from the original CLI's utils.c. */
size_t abs_height(ssize_t height) {
    return height < 0 ? (size_t)-height : (size_t)height;
}

static unsigned char *pixels;
static unsigned char *row;
static int image_width;
static int image_height;

int prepare(int width, int height) {
    if (width < 1 || height < 1 || width > 2048 || height > 2048) return 0;
    if (width == image_width && height == image_height && pixels && row) return 1;
    unsigned char *next_pixels = malloc((size_t)width * height * 4);
    unsigned char *next_row = malloc((size_t)width * 4 + 4);
    if (!next_pixels || !next_row) {
        free(next_pixels);
        free(next_row);
        return 0;
    }
    free(pixels);
    free(row);
    pixels = next_pixels;
    row = next_row;
    image_width = width;
    image_height = height;
    return 1;
}

unsigned char *get_pixels(void) { return pixels; }

/* Render short bands so the worker can accept new parameters between calls.
 * Compute each original row coordinate in float before invoking the unchanged
 * kernel with one top-down row. No BMP encoding or filesystem is involved. */
int render_rows(float cr, float ci, float sr, float si, float res,
                unsigned iterations, int color, int first, int count) {
    if (!pixels || !row || !isfinite(cr) || !isfinite(ci) ||
        !isfinite(sr) || !isfinite(si) || !isfinite(res) || res <= 0 ||
        iterations > 2000 || first < 0 || count < 1 ||
        first >= image_height || count > image_height - first) return 0;
    const float complex c = cr + ci * I;
    for (int y = first; y < first + count; ++y) {
        const float row_imag = si - (float)y * res;
        const float complex start = sr + row_imag * I;
        julia(c, start, (size_t)image_width, -1, res, iterations, color != 0, row);
        unsigned char *dest = pixels + (size_t)y * image_width * 4;
        for (int x = 0; x < image_width; ++x) {
            dest[4*x] = color ? row[4*x+2] : row[x];
            dest[4*x+1] = color ? row[4*x+1] : row[x];
            dest[4*x+2] = color ? row[4*x] : row[x];
            dest[4*x+3] = 255;
        }
    }
    return 1;
}
