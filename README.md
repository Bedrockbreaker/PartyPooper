# Party Pooper

Modding Utility for Party Project

> [!IMPORTANT]
> Party Pooper does *not* contain of any Party Project's code or assets.
> As far as I'm aware, Party Project does not explictly define a license, making it All Rights Reserved by default.
> Download your own (free) copy of Party Project yourself from their itch page.

## Usage

(`PartyPooper --help`)
```
Usage: PartyPooper [options] <file> [destination]

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

Then, run the build tool for the platform(s) you're building for.
```bash
node --experimental-strip-types ./tools/build.ts linux-x64 win-x64
```

Alternatively, use the npm script to build both `linux-x64` and `win-x64`.
```bash
npm run build
```