# Deploy your own lilHub

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/lilAgents/lilhub)

lilHub is your own link in bio, owned by you. It is a clean, fast links page that
lives on your own GitHub and your own free Netlify site. No subscription, no
lock-in, it is just yours.

Click the button above to get your own copy. Netlify forks this template into
your GitHub account and deploys it, so in a couple of minutes you have a live
page at your own address.

## Edit your page

Everything on your page comes from one file, `src/content/profile.json`: your
name, tagline, bio, avatar, brand color, and your list of links. You can edit it
two ways.

- **In the browser:** go to `/admin` on your live site (for example
  `your-name.netlify.app/admin`) and sign in with GitHub. Change your details,
  add links, upload an avatar, and save. Your site rebuilds itself.
- **Locally:** run it on your machine (see below) and open
  `http://localhost:4321/admin` in Chrome, Edge, or Brave.

## Run it locally

```sh
pnpm install
pnpm dev
```

Then open `http://localhost:4321` to see your page and `http://localhost:4321/admin`
to edit it. Build the static site with `pnpm build`; the output lands in `dist/`.

## Use your own domain

Your page works great on its free Netlify address, but you own it, so you can put
it on your own domain like `links.yourname.com` whenever you want. See
[docs/connect-your-domain.md](docs/connect-your-domain.md) for the full walkthrough.

## License

MIT. See [LICENSE](LICENSE). Made with love by [lilAgents](https://lilagents.com).
