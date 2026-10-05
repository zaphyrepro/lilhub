# Connect your own domain

Your lilHub lives on a free Netlify address like `your-name.netlify.app`, and it works great there. But you own this page, so you can put it on your own domain like `links.yourname.com` or even `yourname.com` whenever you want. Here is how, start to finish. It takes about five minutes of clicking, plus a little waiting while the internet catches up.

## What you need

- Your lilHub already deployed on Netlify.
- A domain you own. If you do not have one yet, you can buy one from any registrar such as Namecheap, Cloudflare, Porkbun, or Google Domains. A domain usually runs about $10 to $15 a year.

## Step 1: Add your domain in Netlify

1. Open your site in Netlify.
2. Go to Domain management, under Site configuration.
3. Click Add a domain, type your domain (for example `yourname.com`), click Verify, then Add domain.

Netlify now knows the domain belongs to you. Next you point the domain at Netlify.

## Step 2: Point your domain at Netlify

There are two ways to do this. The first is easier and the one we recommend.

### Option A: Let Netlify run your DNS (recommended)

1. On that same Domain management screen, Netlify offers to set up Netlify DNS. Accept it.
2. Netlify shows you four nameservers, something like `dns1.p01.nsone.net`.
3. Go to wherever you bought the domain, find the nameservers setting, and replace the existing nameservers with the four Netlify gave you.
4. Save.

That is the whole job. Netlify now handles your DNS and your security certificate automatically. This is the most hands-off path, so use it unless you have a reason not to.

### Option B: Keep your current DNS

If you would rather leave your domain where it already lives, for example you keep all your DNS on Cloudflare, add these two records at your registrar instead:

- For the bare domain (`yourname.com`): an A record pointing to `75.2.60.5`.
- For `www`: a CNAME record pointing to `your-name.netlify.app`.

Netlify will detect these and finish the setup.

## Step 3: Wait a little

DNS changes are not instant. They usually take a few minutes, sometimes a couple of hours, and in rare cases up to a day. You do not need to do anything while you wait. Netlify updates the domain status on its own as the change spreads.

## Step 4: HTTPS turns on by itself

Once the domain points at Netlify, Netlify issues a free SSL certificate for you, so your site loads securely on `https://` with the padlock. No setup and no cost. If it has not flipped to secured within an hour or so after your DNS resolves, click Renew certificate in Domain management to give it a nudge.

## Step 5: Make it your primary address

In Domain management, set your custom domain as the primary domain. Netlify then automatically redirects the old `your-name.netlify.app` address to it, so anyone who still has the old link lands in the right place.

## Done

Your lilHub now lives at your own domain, on infrastructure you control, with a certificate that renews itself. If you ever decide to move off lilHub, the domain comes with you, because it was always yours.

Stuck on a step? Netlify's domain docs are thorough, and you can always reach us at [lilAgents](https://lilagents.com).
