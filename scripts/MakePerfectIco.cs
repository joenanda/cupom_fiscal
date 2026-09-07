using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

namespace IcoGenerator
{
    class Program
    {
        static void Main(string[] args)
        {
            string baseDir = Directory.GetCurrentDirectory();
            string logoPath = Path.Combine(baseDir, "public", "assets", "logo.png");

            if (!File.Exists(logoPath))
            {
                Console.WriteLine("Logo not found: " + logoPath);
                return;
            }

            using (Image srcImg = Image.FromFile(logoPath))
            {
                byte[] icoBytes = CreateMultiResIco(srcImg);

                string launcherIco = Path.Combine(baseDir, "launcher", "app.ico");
                string installerIco = Path.Combine(baseDir, "installer", "app.ico");
                string releaseIco = Path.Combine(baseDir, "release", "app.ico");
                string publicIco = Path.Combine(baseDir, "public", "assets", "favicon.ico");

                File.WriteAllBytes(launcherIco, icoBytes);
                File.WriteAllBytes(installerIco, icoBytes);
                File.WriteAllBytes(releaseIco, icoBytes);
                File.WriteAllBytes(publicIco, icoBytes);

                Console.WriteLine("Multi-resolution 32-bit ICO successfully generated! Size: " + icoBytes.Length + " bytes");
            }
        }

        static byte[] CreateMultiResIco(Image srcImg)
        {
            // Sizes: 256 (PNG), 64, 48, 32, 16 (all 32-bit uncompressed DIBs for 100% Windows GDI compatibility)
            int[] dibSizes = new int[] { 64, 48, 32, 16 };
            
            List<IconEntry> entries = new List<IconEntry>();

            // 1. 256x256 as PNG
            using (Bitmap b256 = ResizeImage(srcImg, 256, 256))
            {
                using (MemoryStream ms = new MemoryStream())
                {
                    b256.Save(ms, ImageFormat.Png);
                    byte[] pngBytes = ms.ToArray();
                    entries.Add(new IconEntry
                    {
                        Width = 0, // 0 = 256
                        Height = 0,
                        BitCount = 32,
                        Data = pngBytes
                    });
                }
            }

            // 2. DIB entries for standard Windows resolutions
            foreach (int size in dibSizes)
            {
                using (Bitmap b = ResizeImage(srcImg, size, size))
                {
                    byte[] dibData = Create32bppDib(b);
                    entries.Add(new IconEntry
                    {
                        Width = (byte)size,
                        Height = (byte)size,
                        BitCount = 32,
                        Data = dibData
                    });
                }
            }

            // Write ICO structure
            using (MemoryStream outMs = new MemoryStream())
            using (BinaryWriter bw = new BinaryWriter(outMs))
            {
                // ICONDIR
                bw.Write((ushort)0); // Reserved
                bw.Write((ushort)1); // Type = 1 (ICO)
                bw.Write((ushort)entries.Count); // Count

                int offset = 6 + (16 * entries.Count);

                foreach (var entry in entries)
                {
                    bw.Write(entry.Width);
                    bw.Write(entry.Height);
                    bw.Write((byte)0); // Color count
                    bw.Write((byte)0); // Reserved
                    bw.Write((ushort)1); // Planes
                    bw.Write((ushort)entry.BitCount);
                    bw.Write((uint)entry.Data.Length);
                    bw.Write((uint)offset);

                    offset += entry.Data.Length;
                }

                foreach (var entry in entries)
                {
                    bw.Write(entry.Data);
                }

                bw.Flush();
                return outMs.ToArray();
            }
        }

        static byte[] Create32bppDib(Bitmap bmp)
        {
            int width = bmp.Width;
            int height = bmp.Height;

            int biSize = 40;
            int xorSize = width * height * 4;
            int andStride = ((width + 31) / 32) * 4;
            int andSize = andStride * height;
            int totalSize = biSize + xorSize + andSize;

            byte[] buffer = new byte[totalSize];
            using (MemoryStream ms = new MemoryStream(buffer))
            using (BinaryWriter bw = new BinaryWriter(ms))
            {
                // BITMAPINFOHEADER
                bw.Write((uint)biSize);
                bw.Write((int)width);
                bw.Write((int)(height * 2)); // Icons specify XOR + AND height combined
                bw.Write((ushort)1); // Planes
                bw.Write((ushort)32); // 32 bits per pixel
                bw.Write((uint)0); // BI_RGB (no compression)
                bw.Write((uint)(xorSize + andSize));
                bw.Write((int)0); // XPelsPerMeter
                bw.Write((int)0); // YPelsPerMeter
                bw.Write((uint)0); // ClrUsed
                bw.Write((uint)0); // ClrImportant

                // Pixel data: bottom-to-top, BGRA format
                for (int y = height - 1; y >= 0; y--)
                {
                    for (int x = 0; x < width; x++)
                    {
                        Color c = bmp.GetPixel(x, y);
                        bw.Write(c.B);
                        bw.Write(c.G);
                        bw.Write(c.R);
                        bw.Write(c.A);
                    }
                }

                // AND mask: 1 bit per pixel, bottom-to-top (all 0 for 32bpp where alpha channel defines transparency)
                byte[] andMask = new byte[andSize];
                bw.Write(andMask);

                bw.Flush();
            }

            return buffer;
        }

        static Bitmap ResizeImage(Image img, int width, int height)
        {
            Bitmap bmp = new Bitmap(width, height, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.SmoothingMode = SmoothingMode.HighQuality;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.CompositingQuality = CompositingQuality.HighQuality;
                g.Clear(Color.Transparent);
                g.DrawImage(img, 0, 0, width, height);
            }
            return bmp;
        }

        class IconEntry
        {
            public byte Width;
            public byte Height;
            public ushort BitCount;
            public byte[] Data;
        }
    }
}
