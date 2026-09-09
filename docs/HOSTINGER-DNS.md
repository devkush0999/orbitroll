# Hostinger DNS — admin custom domain

Registered hostname: `admin-orbitroll.deveshkumarsingh.com`

Status at setup: pending DNS verification and TLS. Private preview: https://orbit-roll-admin.greensturn.chatgpt.site

The domain is registered with **Hostinger**. In hPanel, open **Domains → DNS**, select **deveshkumarsingh.com**, then open **DNS records**. The domain management view also exposes this under **DNS / Nameservers**.

Check which nameservers currently serve the domain. If they point to another DNS provider, add the records there instead; edits in Hostinger will not become authoritative while external nameservers are in use. No domain transfer or nameserver change is required for this setup.

Add the following records one at a time using **Add Record** in the **deveshkumarsingh.com** DNS zone. Review any existing records at the same names before changing them. Do not modify apex or email records.

| Type | Hostinger Name | Value |
| --- | --- | --- |
| CNAME | admin-orbitroll | custom-domains.chatgpt.site. |
| TXT | _openai-site-verification.admin-orbitroll | openai-site-verification=Wg9xOA4WM1Qy9FP8G5YqFQpnsdYns0Che8ZKibZr-CQ |
| TXT | _cf-custom-hostname.admin-orbitroll | 6398d0a6-5ca6-409a-98ab-655237e0d1d3 |

Enter the short names exactly as shown, without appending `.deveshkumarsingh.com`. Use the CNAME value as the target / Points to field and each TXT value as its content, without surrounding quotes. Use the default TTL. These are the actual records returned by the hosting provider; they are not Cloudflare Pages records. Complete this set only if retaining the current Sites host. A future Pages deployment returns a different CNAME target.

DNS propagation can take up to 24 hours. After adding the records, refresh custom-domain status in the hosting service until DNS and TLS are active. Additional certificate validation records may be requested. A custom hostname does not change the preview's access policy: the admin preview remains private, and Supabase still requires an administrator account.

The player website's prior hosting project is currently inaccessible to the connector (`project_not_found`). No replacement project or player DNS record was created. Restore access to that project, or deploy the Expo `dist` output to a separate Cloudflare Pages project before adding the player subdomain.

Cloudinary uploads also require the media migration, deployed Edge Function, signed presets, and a rotated API secret in Supabase secrets. Do not place the secret in DNS records.


Hostinger reference: [Manage DNS records in hPanel](https://www.hostinger.com/support/1583249-how-to-manage-dns-records-at-hostinger/).
