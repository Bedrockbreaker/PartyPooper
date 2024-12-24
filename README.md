# Party Pooper

Modding Utility for Party Project

> [!IMPORTANT]
> Party Pooper does *not* contain of any Party Project's code or assets.
> As far as I'm aware, Party Project does not explictly define a license, making it All Rights Reserved by default.
> Download your own (free) copy of Party Project yourself from their itch page.

> [!NOTE]
> The default build configuration and releases for Party Pooper bundle an LGPL-licensed build of FFmpeg.
> You can either modify the build script to substitute a different version of FFmpeg, or build Party Pooper from source using the `--ffmpeg shared` option to use your system's version of ffmpeg instead.
> Alternatively, you can disable FFmpeg support and related commands entirely by building with `--ffmpeg none`.
> The license for the version of FFmpeg that's bundled by default can be found at https://github.com/FFmpeg/FFmpeg/blob/master/LICENSE.md

## Usage

(`PartyPooper --help`)
```
Usage: PartyPooper [options] [command]

Modding Utility for Party Project

Options:
  -V, --version                output the version number
  -h, --help                   display help for command

Commands:
  pack <assets> [output]       packs assets into a package.nw file
  unpack <file> [destination]  unpacks a package.nw file
  help [command]               display help for command
```

## Building from Source

Requires Node.js `v20.6.0` or later.

```bash
git clone https://github.com/Bedrockbreaker/PartyPooper
cd PartyPooper
npm install
```

Then, run the build tool:
```bash
node --experimental-strip-types ./tools/build.ts
```

There are a number of options for building:
(`node --experimental-strip-types ./tools/build.ts --help`)
```
Usage: build [options] [targets...]

builds the project

Arguments:
  targets                       Platform(s) to build for, e.g. 'linux-x64' or 'win-arm64' (default: linux-x64)

Options:
  -n, --node-version <version>  Node version to build for (default: v22.11.0)
  -d, --debug                   Build in debug mode (default: false)
  -f, --ffmpeg <mode>           Configure ffmpeg support. Static bundles ffmpeg into the binary. Shared uses the system ffmpeg. None disables ffmpeg support.
                                (choices: "static", "shared", "none", default: "static")
  -h, --help                    display help for command
```

> [!NOTE]
> Some of the build defaults are dependant on the host platform and version of Node being used.