# Stripe Setup Guide for Bonnie's Boutique

Hello Bonnie! To get your secure credit card checkout working and receive payments directly to your bank account, we need to connect the website to your Stripe account.

Please follow these simple steps to find your Stripe API keys and add them to the website.

## Step 1: Create or Log In to Your Stripe Account

1. Go to [Stripe.com](https://stripe.com) and log in.
2. If you don't have an account, sign up for one and complete the onboarding process (you'll need to provide your business and bank account details so you can get paid).

## Step 2: Get Your Secret Key

1. From your Stripe Dashboard, look for the **"Developers"** button in the top right corner and click it.
2. In the Developers menu (on the left side), click on **"API keys"**.
3. You will see a section called **Standard keys**. 
4. Look for the key named **Secret key** (it usually starts with `sk_live_...` or `sk_test_...`).
5. Click **"Reveal live key"** or **"Reveal test key"** (use the test key if you just want to test things out, or the live key for real money).
6. Copy this Secret key. **Keep this key safe! Do not share it publicly.**

## Step 3: Add the Key to Your Website (Netlify)

Since your website is hosted on Netlify, you need to save this key in your Netlify settings so the website can talk to Stripe securely.

1. Log in to your [Netlify Dashboard](https://app.netlify.com).
2. Click on your website project (**tbtshop** or **btboutique**).
3. Go to **"Site configuration"** (or "Site settings").
4. On the left sidebar, click on **"Environment variables"**.
5. Click the **"Add a variable"** button, and select **"Add a single variable"**.
6. In the **Key** field, type exactly: `STRIPE_SECRET_KEY`
7. In the **Value** field, paste the Secret key you copied from Stripe.
8. Click **"Create variable"** (or Save).

## Step 4: Add the Key for Local Development (Optional)

If your developer (or you) is testing the site locally on their computer, they need the key too:
1. In the root folder of the website code, find or create a file named `.env`.
2. Open it and add this line:
   ```
   STRIPE_SECRET_KEY=sk_your_secret_key_here
   ```
3. Save the file. (Make sure `.env` is inside `.gitignore` so it's never uploaded to GitHub).

## Step 5: Test the Checkout!

1. Once the key is saved in Netlify, go to Netlify and trigger a new deployment of your site (or wait if it automatically deploys).
2. Go to your live website `https://btboutique.com`, add an item to the cart, and proceed to checkout using the "Credit / Debit Card" option.
3. You should be securely redirected to Stripe's checkout page, and you will see the calculated shipping rates!

If you used a live key, test with a small $1 item or wait for a real customer. If you used a test key, you can use [Stripe's test card numbers](https://stripe.com/docs/testing) to make sure it works.
