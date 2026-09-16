/* Native, whole-image reference: exercise the original scalar kernel without
 * the browser bridge, then independently convert its BMP pixel layout. */
#include "../src/julia/vendor/julia.h"
#include <stdio.h>
#include <stdlib.h>

size_t abs_height(ssize_t height) {
    return height < 0 ? (size_t)-height : (size_t)height;
}

int main(int argc, char **argv) {
    if (argc != 10) return 1;
    const float cr = strtof(argv[1], NULL), ci = strtof(argv[2], NULL);
    const float sr = strtof(argv[3], NULL), si = strtof(argv[4], NULL);
    const size_t width = strtoul(argv[5], NULL, 10);
    const ssize_t height = strtol(argv[6], NULL, 10);
    const float res = strtof(argv[7], NULL);
    const unsigned iterations = (unsigned)strtoul(argv[8], NULL, 10);
    const bool color = atoi(argv[9]) != 0;
    const size_t raw_length = width * (color ? 4 : 1);
    const size_t stride = (raw_length + 3) & ~(size_t)3;
    unsigned char *buffer = calloc(abs_height(height), stride);
    if (!buffer) return 2;
    julia_V1(cr + ci * I, sr + si * I, width, height, res, iterations, color, buffer);
    for (size_t y = 0; y < abs_height(height); ++y) {
        const size_t source_y = height < 0 ? y : abs_height(height) - 1 - y;
        const unsigned char *row = buffer + source_y * stride;
        for (size_t x = 0; x < width; ++x) {
            const unsigned char rgba[4] = {color ? row[4*x+2] : row[x],
                color ? row[4*x+1] : row[x], color ? row[4*x] : row[x], 255};
            fwrite(rgba, 1, 4, stdout);
        }
    }
    free(buffer);
    return 0;
}
