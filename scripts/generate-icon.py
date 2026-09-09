"""Render the original geometric Orbit Roll icon using only Python's standard library."""
import binascii
from pathlib import Path
import struct
import zlib

SIZE = 1024


def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', binascii.crc32(kind + data) & 0xffffffff)


def render(transparent=False):
    background = (0, 0, 0, 0) if transparent else (8, 13, 24, 255)
    pixels = bytearray(background * SIZE * SIZE)

    def polygon(points, color):
        for y in range(min(p[1] for p in points), max(p[1] for p in points) + 1):
            intersections = []
            for a, b in zip(points, points[1:] + points[:1]):
                if (a[1] <= y < b[1]) or (b[1] <= y < a[1]):
                    intersections.append(int(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])))
            intersections.sort()
            for start, end in zip(intersections[::2], intersections[1::2]):
                for x in range(start, end + 1):
                    offset = (y * SIZE + x) * 4
                    pixels[offset:offset + 4] = bytes(color)

    polygon([(512, 310), (704, 420), (512, 532), (320, 420)], (224, 255, 201, 255))
    polygon([(320, 420), (512, 532), (512, 754), (320, 642)], (121, 183, 99, 255))
    polygon([(512, 532), (704, 420), (704, 642), (512, 754)], (185, 247, 139, 255))
    for x, y, radius in [(746, 280, 12), (250, 340, 6), (760, 706, 5), (285, 732, 8)]:
        polygon([(x, y-radius), (x+radius, y), (x, y+radius), (x-radius, y)], (135, 232, 236, 255))
    rows = b''.join(b'\0' + pixels[y * SIZE * 4:(y + 1) * SIZE * 4] for y in range(SIZE))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', SIZE, SIZE, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b''))


assets = Path(__file__).resolve().parent.parent / 'assets'
(assets / 'icon.png').write_bytes(render())
(assets / 'adaptive-icon.png').write_bytes(render(transparent=True))
