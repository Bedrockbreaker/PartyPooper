# Party Pooper

Modding Utility for Party Project

> [!IMPORTANT]
> Party Pooper does *not* contain of any Party Project's code or assets.
> As far as I'm aware, Party Project does not explictly define a license on its code and assets, making it All Rights Reserved by default.
> Download your own (free) copy of Party Project yourself from their itch page.

## Usage

(`PartyPooper --help`)
```
Usage: PartyPooper [options] <file> [destination]

Modding Utility for Party Project

Arguments:
  file           path to the package.nw file
  destination    directory to extract the assets to (default: "./partyproject")

Options:
  -V, --version  output the version number
  -h, --help     display help for command
```

## Building from Source

Requires Node.js `v20.6.0` or later.

Download and install dependencies:
```bash
git clone https://github.com/Bedrockbreaker/PartyPooper
cd PartyPooper
npm install
```

After that, build the actual executable.

Linux:
```bash
npm run build && npm run gen-blob && npm run copy-exec && npm run inject
```

Windows:
```batch
npm run build && npm run gen-blob && npm run copy-exec-win && npm run inject-win
```