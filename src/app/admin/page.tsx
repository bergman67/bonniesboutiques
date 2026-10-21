'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  isDraft: boolean;
  createdAt: string;
};

type OrderItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
};

type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  itemsJson: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  labelUrl: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelCarrier: string | null;
  labelRate: number | null;
  labelStatus: string | null;
  labelError: string | null;
  labelPrinted: boolean;
  createdAt: string;
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'settings' | 'products' | 'orders'>('settings');

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('8');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [search, setSearch] = useState('');

  // Inline Edit Product state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Store & Stripe Settings state
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [stripeSecretKeyMasked, setStripeSecretKeyMasked] = useState('');
  const [stripeSecretKeyInput, setStripeSecretKeyInput] = useState('');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [venmoHandle, setVenmoHandle] = useState('@BonniesBoutique');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [enableStripe, setEnableStripe] = useState(true);
  const [enableVenmo, setEnableVenmo] = useState(true);
  const [enablePaypal, setEnablePaypal] = useState(true);
  const [shippingFlatRate, setShippingFlatRate] = useState('3.99');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('20.00');
  const [savingSettings, setSavingSettings] = useState(false);

  // Stripe Test Connection state
  const [testingStripe, setTestingStripe] = useState(false);
  const [stripeTestResult, setStripeTestResult] = useState<{
    valid: boolean;
    mode?: string;
    accountName?: string;
    chargesEnabled?: boolean;
    error?: string;
  } | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  // Admin Authentication state
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasAdminPin, setHasAdminPin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [loginInput, setLoginInput] = useState('');
  const [setupConfirmInput, setSetupConfirmInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Change Password inside Settings state
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Shippo & Automated Shipping Label state
  const [shippoConfigured, setShippoConfigured] = useState(false);
  const [shippoKeyMasked, setShippoKeyMasked] = useState('');
  const [shippoKeyInput, setShippoKeyInput] = useState('');
  const [autoCreateLabel, setAutoCreateLabel] = useState(true);
  const [autoPrintQueue, setAutoPrintQueue] = useState(true);
  const [returnName, setReturnName] = useState("Bonnie's Boutique");
  const [returnStreet, setReturnStreet] = useState('');
  const [returnCity, setReturnCity] = useState('');
  const [returnState, setReturnState] = useState('');
  const [returnZip, setReturnZip] = useState('');
  const [defaultWeightOz, setDefaultWeightOz] = useState('4.0');
  const [testingShippo, setTestingShippo] = useState(false);
  const [shippoTestResult, setShippoTestResult] = useState<{
    valid: boolean;
    mode?: string;
    carriers?: string;
    error?: string;
  } | null>(null);
  const [creatingLabelOrderId, setCreatingLabelOrderId] = useState<string | null>(null);

  useEffect(() => {
    const savedPin = sessionStorage.getItem('bonnies_admin_pin') || '';
    checkAdminAuth(savedPin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const applySettingsData = (data: Record<string, unknown>) => {
    setStripeConfigured(Boolean(data.stripeConfigured));
    setStripeSecretKeyMasked((data.stripeSecretKeyMasked as string) || '');
    setStripePublishableKey((data.stripePublishableKey as string) || '');
    setVenmoHandle((data.venmoHandle as string) || '@BonniesBoutique');
    setPaypalEmail((data.paypalEmail as string) || '');
    setEnableStripe((data.enableStripe as boolean) ?? true);
    setEnableVenmo((data.enableVenmo as boolean) ?? true);
    setEnablePaypal((data.enablePaypal as boolean) ?? true);
    setShippingFlatRate(String(data.shippingFlatRate ?? 3.99));
    setFreeShippingThreshold(String(data.freeShippingThreshold ?? 20.0));
    setHasAdminPin(Boolean(data.hasAdminPin));
    setShippoConfigured(Boolean(data.shippoConfigured));
    setShippoKeyMasked((data.shippoKeyMasked as string) || '');
    setAutoCreateLabel((data.autoCreateLabel as boolean) ?? true);
    setAutoPrintQueue((data.autoPrintQueue as boolean) ?? true);
    setReturnName((data.returnName as string) || "Bonnie's Boutique");
    setReturnStreet((data.returnStreet as string) || '');
    setReturnCity((data.returnCity as string) || '');
    setReturnState((data.returnState as string) || '');
    setReturnZip((data.returnZip as string) || '');
    setDefaultWeightOz(String(data.defaultWeightOz ?? 4.0));
  };

  const checkAdminAuth = async (pinToTry: string) => {
    setAuthChecking(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/settings?admin=true', {
        headers: pinToTry ? { 'x-admin-pin': pinToTry } : {},
      });
      const data = await res.json();
      if (data.requiresAuth) {
        setHasAdminPin(true);
        setIsAuthenticated(false);
        sessionStorage.removeItem('bonnies_admin_pin');
      } else if (!data.error) {
        applySettingsData(data);
        if (data.hasAdminPin) {
          setAdminPin(pinToTry);
          setIsAuthenticated(true);
          fetchProducts();
          fetchOrders();
        } else {
          // No password configured yet -> prompt first-time password creation
          setHasAdminPin(false);
          setIsAuthenticated(false);
        }
      }
    } catch (_e) {
      setAuthError('Failed to connect to server.');
    } finally {
      setAuthChecking(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const trimmed = loginInput.trim();
    if (!trimmed) {
      setAuthError('Please enter a password.');
      return;
    }

    setAuthSubmitting(true);
    try {
      if (!hasAdminPin) {
        // First-time password setup
        if (trimmed.length < 4) {
          setAuthError('Password must be at least 4 characters.');
          setAuthSubmitting(false);
          return;
        }
        if (trimmed !== setupConfirmInput.trim()) {
          setAuthError('Passwords do not match.');
          setAuthSubmitting(false);
          return;
        }

        const saveRes = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newAdminPin: trimmed }),
        });
        const saveData = await saveRes.json();
        if (!saveData.success) {
          setAuthError(saveData.error || 'Could not set password.');
          setAuthSubmitting(false);
          return;
        }

        sessionStorage.setItem('bonnies_admin_pin', trimmed);
        setAdminPin(trimmed);
        setHasAdminPin(true);
        setIsAuthenticated(true);
        setLoginInput('');
        setSetupConfirmInput('');
        fetchProducts();
        fetchOrders();
        showToast('🔒 Admin password created! Your dashboard is now protected.');
      } else {
        // Verify existing password
        const res = await fetch('/api/settings?admin=true', {
          headers: { 'x-admin-pin': trimmed },
        });
        const data = await res.json();
        if (data.requiresAuth) {
          setAuthError('Incorrect password. Please try again.');
        } else if (!data.error) {
          sessionStorage.setItem('bonnies_admin_pin', trimmed);
          setAdminPin(trimmed);
          applySettingsData(data);
          setIsAuthenticated(true);
          setLoginInput('');
          fetchProducts();
          fetchOrders();
          showToast('🔓 Welcome back to Bonnie\'s Boutique Admin!');
        } else {
          setAuthError(data.error || 'Login failed.');
        }
      }
    } catch (_e) {
      setAuthError('Network error. Please try again.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('bonnies_admin_pin');
    setAdminPin('');
    setIsAuthenticated(false);
    setLoginInput('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPasswordInput.trim();
    if (trimmed.length < 4) {
      showToast('⚠️ New password must be at least 4 characters.');
      return;
    }
    if (trimmed !== confirmNewPasswordInput.trim()) {
      showToast('⚠️ New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify({
          verifyPin: adminPin,
          newAdminPin: trimmed,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminPin(trimmed);
        sessionStorage.setItem('bonnies_admin_pin', trimmed);
        setNewPasswordInput('');
        setConfirmNewPasswordInput('');
        showToast('🔒 Admin password updated!');
      } else {
        showToast('⚠️ ' + (data.error || 'Failed to update password'));
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch (_e) {}
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch (_e) {
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const payload: Record<string, unknown> = {
        verifyPin: adminPin,
        stripePublishableKey,
        venmoHandle,
        paypalEmail,
        enableStripe,
        enableVenmo,
        enablePaypal,
        shippingFlatRate: parseFloat(shippingFlatRate) || 0,
        freeShippingThreshold: parseFloat(freeShippingThreshold) || 0,
        autoCreateLabel,
        autoPrintQueue,
        returnName,
        returnStreet,
        returnCity,
        returnState,
        returnZip,
        defaultWeightOz: parseFloat(defaultWeightOz) || 4.0,
      };
      if (stripeSecretKeyInput.trim() !== '') {
        payload.stripeSecretKey = stripeSecretKeyInput.trim();
      }
      if (shippoKeyInput.trim() !== '') {
        payload.shippoApiKey = shippoKeyInput.trim();
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setStripeConfigured(Boolean(data.stripeConfigured));
        setStripeSecretKeyMasked(data.stripeSecretKeyMasked || '');
        setStripeSecretKeyInput('');
        setShippoConfigured(Boolean(data.shippoConfigured));
        setShippoKeyMasked(data.shippoKeyMasked || '');
        setShippoKeyInput('');
        showToast('✓ Store, Stripe & Shipping Label settings saved!');
      } else {
        showToast('⚠️ ' + (data.error || 'Could not save settings'));
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestShippo = async () => {
    setTestingShippo(true);
    setShippoTestResult(null);
    try {
      const res = await fetch('/api/settings/test-shippo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify({
          shippoApiKey: shippoKeyInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      setShippoTestResult(data);
      if (data.valid && shippoKeyInput.trim()) {
        const saveRes = await fetch('/api/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': adminPin,
          },
          body: JSON.stringify({
            verifyPin: adminPin,
            shippoApiKey: shippoKeyInput.trim(),
            returnName,
            returnStreet,
            returnCity,
            returnState,
            returnZip,
            defaultWeightOz: parseFloat(defaultWeightOz) || 4.0,
            autoCreateLabel,
            autoPrintQueue,
          }),
        });
        const saveData = await saveRes.json();
        if (saveData.success) {
          setShippoConfigured(true);
          setShippoKeyMasked(saveData.shippoKeyMasked || '');
          setShippoKeyInput('');
          showToast('✓ Shippo connected & saved automatically!');
        }
      }
    } catch (_e) {
      setShippoTestResult({ valid: false, error: 'Network error testing Shippo connection' });
    } finally {
      setTestingShippo(false);
    }
  };

  const handleBuyShippingLabel = async (order: Order) => {
    setCreatingLabelOrderId(order.id);
    try {
      const res = await fetch('/api/orders/label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (data.success && data.labelUrl) {
        await fetchOrders();
        showToast(`✓ USPS Label Created! Tracking: ${data.trackingNumber || 'Ready'}`);
        window.open(data.labelUrl, '_blank');
      } else {
        await fetchOrders();
        showToast('⚠️ ' + (data.error || 'Could not generate shipping label'));
      }
    } catch (_e) {
      showToast('⚠️ Network error while generating shipping label.');
    } finally {
      setCreatingLabelOrderId(null);
    }
  };

  const handleMarkLabelPrinted = async (orderId: string, printed = true) => {
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, labelPrinted: printed }),
    });
    fetchOrders();
  };

  const handlePrintPackingSlip = (order: Order) => {
    let parsedItems: OrderItem[] = [];
    try {
      parsedItems = JSON.parse(order.itemsJson);
    } catch (_e) {}

    const fromLine = returnStreet
      ? `${returnName || "Bonnie's Boutique"}<br/>${returnStreet}<br/>${returnCity}, ${returnState} ${returnZip}`
      : `${returnName || "Bonnie's Boutique"}<br/>btboutiqe.com`;

    const win = window.open('', '_blank', 'width=850,height=950');
    if (!win) {
      showToast('⚠️ Please allow pop-ups to print the packing slip.');
      return;
    }

    const itemsRows = parsedItems
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px 8px; border-bottom: 1px solid #ddd; font-size: 18px; font-weight: bold;">[ &nbsp; ] &nbsp; ${item.quantity}x</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #ddd; font-size: 18px;">${item.title}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #ddd; font-size: 18px; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`
      )
      .join('');

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Packing Slip & Address Label - ${order.customerName}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
          .cut-box {
            border: 3px dashed #000;
            padding: 24px;
            border-radius: 12px;
            margin-bottom: 30px;
            background: #fff;
          }
          .from-addr { font-size: 15px; line-height: 1.4; margin-bottom: 20px; color: #333; }
          .to-badge { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #555; margin-bottom: 6px; }
          .to-addr { font-size: 26px; font-weight: bold; line-height: 1.35; margin-left: 20px; }
          .slip-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { text-align: left; border-bottom: 2px solid #222; padding: 8px; font-size: 15px; text-transform: uppercase; }
          @media print {
            .no-print { display: none !important; }
            body { margin: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="background: #e8748a; color: white; border: none; padding: 12px 24px; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer;">
            🖨️ Print Now
          </button>
        </div>

        <div class="cut-box">
          <div style="font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 10px;">
            ✂️ Cut Along Dashed Line to Tape onto Package (or use with your Postage Label)
          </div>
          <div class="from-addr">
            <strong>FROM:</strong><br/>
            ${fromLine}
          </div>
          <div class="to-badge">SHIP TO:</div>
          <div class="to-addr">
            ${order.customerName}<br/>
            ${order.shippingAddress.replace(/,\s*/g, '<br/>')}
          </div>
          ${order.trackingNumber ? `<div style="margin-top: 16px; font-size: 16px;"><strong>USPS Tracking #:</strong> ${order.trackingNumber}</div>` : ''}
        </div>

        <div class="slip-header">
          <div>
            <h1 style="margin: 0; font-size: 24px;">Bonnie's Boutique — Packing Checklist</h1>
            <p style="margin: 4px 0 0; font-size: 14px; color: #555;">Order Date: ${new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div style="text-align: right; font-size: 15px;">
            <strong>Customer:</strong> ${order.customerName}<br/>
            ${order.customerPhone ? `<strong>Phone:</strong> ${order.customerPhone}<br/>` : ''}
            <strong>Paid Via:</strong> ${order.paymentMethod.toUpperCase()} (${order.paymentStatus.toUpperCase()})
          </div>
        </div>

        <p style="font-size: 16px; margin-bottom: 8px;">Check off each trinket as you place it in the box:</p>
        <table>
          <thead>
            <tr>
              <th style="width: 110px;">Packed?</th>
              <th>Trinket Item</th>
              <th style="text-align: right; width: 100px;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div style="margin-top: 20px; text-align: right; font-size: 18px;">
          <p style="margin: 4px 0;">Subtotal: $${order.subtotal.toFixed(2)} &nbsp;|&nbsp; Shipping: $${order.shippingCost.toFixed(2)}</p>
          <p style="margin: 6px 0; font-size: 22px; font-weight: bold;">Total: $${order.total.toFixed(2)}</p>
        </div>

        <div style="margin-top: 32px; text-align: center; font-size: 16px; font-style: italic; color: #444;">
          Thank you so much for supporting Bonnie &amp; Tammy's handcrafted boutique! 💖
        </div>

        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 300); };
        </script>
      </body>
      </html>
    `);
    win.document.close();
    handleMarkLabelPrinted(order.id, true);
  };

  const handleTestStripe = async () => {
    setTestingStripe(true);
    setStripeTestResult(null);
    try {
      const res = await fetch('/api/settings/test-stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify({
          stripeSecretKey: stripeSecretKeyInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      setStripeTestResult(data);
      if (data.valid && stripeSecretKeyInput.trim()) {
        // Automatically save the key if it tested valid!
        const saveRes = await fetch('/api/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': adminPin,
          },
          body: JSON.stringify({
            verifyPin: adminPin,
            stripeSecretKey: stripeSecretKeyInput.trim(),
            stripePublishableKey,
          }),
        });
        const saveData = await saveRes.json();
        if (saveData.success) {
          setStripeConfigured(true);
          setStripeSecretKeyMasked(saveData.stripeSecretKeyMasked || '');
          setStripeSecretKeyInput('');
          showToast('✓ Stripe verified & saved automatically!');
        }
      }
    } catch (_e) {
      setStripeTestResult({ valid: false, error: 'Network error testing Stripe connection' });
    } finally {
      setTestingStripe(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl = null;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, price: parseFloat(price) || 8, imageUrl, isDraft: false }),
      });

      setTitle(''); setDescription(''); setPrice('8'); setFile(null); setPreview(null);
      await fetchProducts();
      showToast('✓ Product added to store!');
    } finally {
      setLoading(false);
    }
  };

  const startEditingProduct = (p: Product) => {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditPrice(String(p.price ?? 8));
    setEditDesc(p.description || '');
  };

  const saveEditProduct = async (p: Product) => {
    await fetch(`/api/products/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...p,
        title: editTitle,
        price: parseFloat(editPrice) || 8,
        description: editDesc,
      }),
    });
    setEditingId(null);
    await fetchProducts();
    showToast('✓ Product updated!');
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    fetchProducts();
    showToast('Product deleted.');
  };

  const handleToggleDraft = async (p: Product) => {
    await fetch(`/api/products/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...p, isDraft: !p.isDraft }),
    });
    fetchProducts();
    showToast(p.isDraft ? '✓ Product published!' : 'Product hidden (Draft).');
  };

  const handleUpdateOrderStatus = async (orderId: string, paymentStatus: string) => {
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, paymentStatus }),
    });
    fetchOrders();
    showToast(`✓ Order marked as ${paymentStatus}!`);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Delete this order record?')) return;
    await fetch(`/api/orders?id=${orderId}`, { method: 'DELETE' });
    fetchOrders();
    showToast('Order deleted.');
  };

  const filtered = products
    .filter(p => filter === 'all' ? true : filter === 'draft' ? p.isDraft : !p.isDraft)
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all: products.length,
    published: products.filter(p => !p.isDraft).length,
    draft: products.filter(p => p.isDraft).length,
  };

  const inputStyle = {
    background: 'rgba(26,15,36,0.75)',
    border: '1px solid rgba(232,116,138,0.25)',
    color: '#f5efe6',
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a0f24' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#e8748a] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono tracking-widest uppercase" style={{ color: 'rgba(245,239,230,0.6)' }}>
            Verifying Admin Access...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#1a0f24', color: '#f5efe6' }}>
        <div
          className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
          style={{ background: 'rgba(61, 37, 82, 0.55)', border: '1px solid rgba(232,116,138,0.25)', backdropFilter: 'blur(16px)' }}
        >
          <div className="flex flex-col items-center text-center mb-6">
            <Image src="/bt_logo.jpg" alt="B&T Trinkets" width={72} height={72} className="object-contain rounded-xl mb-3" />
            <h1 className="text-xl font-bold" style={{ color: '#f5efe6' }}>
              {hasAdminPin ? 'Bonnie\'s Boutique Admin' : 'Set Up Admin Password'}
            </h1>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'rgba(245,239,230,0.65)' }}>
              {hasAdminPin
                ? 'Enter your admin password to unlock your store manager.'
                : 'Welcome! Create an admin password to protect your store settings, products, and customer orders.'}
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.75)' }}>
                {hasAdminPin ? 'Admin Password' : 'Create Admin Password'}
              </label>
              <input
                type="password"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder={hasAdminPin ? 'Enter your password...' : 'Choose a password (min 4 chars)...'}
                autoFocus
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
            </div>

            {!hasAdminPin && (
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.75)' }}>
                  Confirm Admin Password
                </label>
                <input
                  type="password"
                  value={setupConfirmInput}
                  onChange={(e) => setSetupConfirmInput(e.target.value)}
                  placeholder="Re-enter your password..."
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            )}

            {authError && (
              <div
                className="rounded-xl px-4 py-2.5 text-xs font-semibold"
                style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
              >
                ⚠️ {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all"
              style={{
                background: 'linear-gradient(135deg, #e8748a, #c44b63)',
                color: 'white',
                boxShadow: '0 6px 20px rgba(232,116,138,0.35)',
              }}
            >
              {authSubmitting
                ? 'Please wait...'
                : hasAdminPin
                ? '🔓 Unlock Admin Dashboard'
                : '🔒 Save Password & Enter Admin'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t text-center" style={{ borderColor: 'rgba(232,116,138,0.15)' }}>
            <Link href="/" className="text-xs hover:underline" style={{ color: 'rgba(245,239,230,0.55)' }}>
              ← Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#1a0f24' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl transition-all"
          style={{ background: '#e8748a', color: 'white' }}
        >
          {toast}
        </div>
      )}

      {/* Top Navigation Bar */}
      <header
        className="sticky top-0 z-50 py-3 px-6 flex flex-wrap justify-between items-center gap-4"
        style={{
          background: 'rgba(26, 15, 36, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(232, 116, 138, 0.2)',
        }}
      >
        <div className="flex items-center gap-3">
          <Image src="/bt_logo.jpg" alt="B&T Trinkets" width={56} height={56} className="object-contain rounded-lg w-12 h-12" />
          <div>
            <h1 className="text-base font-bold" style={{ color: '#f5efe6' }}>Bonnie&apos;s Boutique Admin</h1>
            <p className="text-xs" style={{ color: 'rgba(245,239,230,0.5)' }}>Easy Plug &amp; Play Store Manager</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5"
            style={
              stripeConfigured
                ? { background: 'rgba(107, 203, 119, 0.15)', color: '#6bcb77', border: '1px solid rgba(107,203,119,0.35)' }
                : { background: 'rgba(249, 199, 79, 0.15)', color: '#f9c74f', border: '1px solid rgba(249,199,79,0.35)' }
            }
          >
            <span>{stripeConfigured ? '🟢' : '🟡'}</span>
            <span>{stripeConfigured ? 'Stripe Connected' : 'Stripe Key Needed'}</span>
          </span>

          <Link
            href="/"
            className="text-xs px-4 py-2 rounded-full border transition-all hover:bg-white/5"
            style={{ borderColor: 'rgba(245, 239, 230, 0.25)', color: '#f5efe6' }}
          >
            ← View Live Store
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="text-xs px-3.5 py-2 rounded-full border transition-all hover:bg-white/5"
            style={{ borderColor: 'rgba(232, 116, 138, 0.35)', color: '#e8748a' }}
          >
            🔒 Lock
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Main Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b pb-4" style={{ borderColor: 'rgba(232,116,138,0.15)' }}>
          {[
            { id: 'settings', label: '💳 Plug & Play Stripe & Shipping', badge: stripeConfigured ? 'Ready' : 'Setup' },
            { id: 'products', label: '🛍️ Manage Products', badge: String(counts.published) },
            { id: 'orders', label: '📦 Customer Orders', badge: String(orders.length) },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'settings' | 'products' | 'orders')}
              className="px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition-all"
              style={
                activeTab === tab.id
                  ? { background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white', boxShadow: '0 4px 15px rgba(232,116,138,0.3)' }
                  : { background: 'rgba(61, 37, 82, 0.45)', color: 'rgba(245,239,230,0.75)', border: '1px solid rgba(232,116,138,0.15)' }
              }
            >
              <span>{tab.label}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: activeTab === tab.id ? 'rgba(0,0,0,0.25)' : 'rgba(232,116,138,0.15)',
                  color: activeTab === tab.id ? 'white' : '#e8748a',
                }}
              >
                {tab.badge}
              </span>
            </button>
          ))}
        </div>

        {/* =====================================================================
            TAB 1: PLUG & PLAY STRIPE & SHIPPING SETUP
           ===================================================================== */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Visual Step-by-Step Guide for Bonnie */}
            <div className="lg:col-span-1 space-y-6">
              <div
                className="rounded-2xl p-6"
                style={{ background: 'rgba(61, 37, 82, 0.5)', border: '1px solid rgba(232,116,138,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">✨</span>
                  <h2 className="text-base font-bold" style={{ color: '#f5efe6' }}>
                    3-Step Stripe Plug &amp; Play
                  </h2>
                </div>
                <p className="text-xs leading-relaxed mb-5" style={{ color: 'rgba(245,239,230,0.65)' }}>
                  No coding or Netlify deployment needed! Paste your Stripe key on this page and your store will immediately accept credit cards &amp; Apple Pay.
                </p>

                <ol className="space-y-4 text-xs">
                  <li className="p-3.5 rounded-xl" style={{ background: 'rgba(26,15,36,0.6)', border: '1px solid rgba(232,116,138,0.15)' }}>
                    <p className="font-bold text-rose-300 mb-1">1. Open Your Stripe API Keys</p>
                    <p className="mb-2.5" style={{ color: 'rgba(245,239,230,0.65)' }}>
                      Log into your Stripe account and click the button below to go straight to your keys page:
                    </p>
                    <a
                      href="https://dashboard.stripe.com/apikeys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block w-full text-center py-2 px-3 rounded-lg font-semibold transition-all"
                      style={{ background: 'rgba(232,116,138,0.2)', color: '#e8748a', border: '1px solid rgba(232,116,138,0.4)' }}
                    >
                      Open Stripe API Keys ↗
                    </a>
                  </li>

                  <li className="p-3.5 rounded-xl" style={{ background: 'rgba(26,15,36,0.6)', border: '1px solid rgba(232,116,138,0.15)' }}>
                    <p className="font-bold text-rose-300 mb-1">2. Copy Your &ldquo;Secret key&rdquo;</p>
                    <p style={{ color: 'rgba(245,239,230,0.65)' }}>
                      Under <strong>Standard keys</strong>, click <strong>&ldquo;Reveal live key&rdquo;</strong> next to <strong>Secret key</strong>. Copy the code that starts with <code className="text-amber-300">sk_live_...</code>
                    </p>
                  </li>

                  <li className="p-3.5 rounded-xl" style={{ background: 'rgba(26,15,36,0.6)', border: '1px solid rgba(232,116,138,0.15)' }}>
                    <p className="font-bold text-rose-300 mb-1">3. Paste &amp; Click &ldquo;Verify &amp; Save&rdquo;</p>
                    <p style={{ color: 'rgba(245,239,230,0.65)' }}>
                      Paste that key into the <strong>Stripe Secret Key</strong> box on the right and click <strong>Test &amp; Save Stripe Key</strong>. Done!
                    </p>
                  </li>
                </ol>
              </div>
            </div>

            {/* Right Column: Interactive Plug & Play Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* Card 1: Stripe Setup */}
                <div
                  className="rounded-2xl p-6"
                  style={{ background: 'rgba(61, 37, 82, 0.5)', border: '1px solid rgba(232,116,138,0.2)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: '#f5efe6' }}>
                        💳 Credit Card &amp; Stripe Integration
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(245,239,230,0.55)' }}>
                        Accept Visa, Mastercard, Amex, and Apple Pay automatically at checkout
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={enableStripe}
                        onChange={(e) => setEnableStripe(e.target.checked)}
                        className="w-4 h-4 accent-[#e8748a] rounded"
                      />
                      <span>Enable Card Checkout</span>
                    </label>
                  </div>

                  {/* Current Status Banner */}
                  <div
                    className="rounded-xl p-4 mb-5 flex flex-wrap items-center justify-between gap-3"
                    style={
                      stripeConfigured
                        ? { background: 'rgba(107, 203, 119, 0.12)', border: '1px solid rgba(107, 203, 119, 0.35)' }
                        : { background: 'rgba(249, 199, 79, 0.12)', border: '1px solid rgba(249, 199, 79, 0.35)' }
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{stripeConfigured ? '✅' : '⚡'}</span>
                      <div>
                        <p className="text-sm font-bold" style={{ color: stripeConfigured ? '#6bcb77' : '#f9c74f' }}>
                          {stripeConfigured ? 'Stripe Key Is Saved & Active' : 'No Stripe Key Connected Yet'}
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(245,239,230,0.65)' }}>
                          {stripeConfigured
                            ? `Current Key: ${stripeSecretKeyMasked}`
                            : 'Paste your sk_live_... or sk_test_... key below to activate card payments.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestStripe}
                      disabled={testingStripe}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: '#e8748a',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(232,116,138,0.3)',
                      }}
                    >
                      {testingStripe ? 'Testing Connection...' : stripeSecretKeyInput ? '✓ Verify & Save Key' : '🔄 Test Saved Key'}
                    </button>
                  </div>

                  {/* Test Result Box */}
                  {stripeTestResult && (
                    <div
                      className="rounded-xl p-4 mb-5 text-xs"
                      style={
                        stripeTestResult.valid
                          ? { background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#a7f3d0' }
                          : { background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5' }
                      }
                    >
                      {stripeTestResult.valid ? (
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-emerald-300">
                            🎉 Connected Successfully! ({stripeTestResult.mode} MODE)
                          </p>
                          <p>Account: <strong>{stripeTestResult.accountName}</strong></p>
                          <p>Card Charges Enabled: <strong>{stripeTestResult.chargesEnabled ? 'Yes — Ready for live sales!' : 'Pending Stripe account verification'}</strong></p>
                        </div>
                      ) : (
                        <p className="font-semibold">❌ {stripeTestResult.error}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.75)' }}>
                        Stripe Secret Key (Starts with <code className="text-rose-300">sk_live_</code> or <code className="text-amber-300">sk_test_</code>)
                      </label>
                      <input
                        type="password"
                        value={stripeSecretKeyInput}
                        onChange={(e) => setStripeSecretKeyInput(e.target.value)}
                        placeholder={stripeConfigured ? `Saved (${stripeSecretKeyMasked}) — Paste new key here to replace` : 'sk_live_51...'}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.75)' }}>
                        Stripe Publishable Key (Optional — Starts with <code className="text-rose-300">pk_live_</code>)
                      </label>
                      <input
                        type="text"
                        value={stripePublishableKey}
                        onChange={(e) => setStripePublishableKey(e.target.value)}
                        placeholder="pk_live_51..."
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Shipping Rates Setup */}
                <div
                  className="rounded-2xl p-6"
                  style={{ background: 'rgba(61, 37, 82, 0.5)', border: '1px solid rgba(232,116,138,0.2)' }}
                >
                  <h3 className="text-lg font-bold mb-1" style={{ color: '#f5efe6' }}>
                    📦 Shipping Rates
                  </h3>
                  <p className="text-xs mb-5" style={{ color: 'rgba(245,239,230,0.55)' }}>
                    Set your standard shipping fee and the order amount that qualifies for free shipping
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.75)' }}>
                        Flat Shipping Rate ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={shippingFlatRate}
                        onChange={(e) => setShippingFlatRate(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.75)' }}>
                        Free Shipping Over ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={freeShippingThreshold}
                        onChange={(e) => setFreeShippingThreshold(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2.5: Plug & Play Automatic USPS Label Generator (Shippo) */}
                <div
                  className="rounded-2xl p-6"
                  style={{ background: 'rgba(61, 37, 82, 0.5)', border: '1px solid rgba(232,116,138,0.2)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: '#f5efe6' }}>
                        🏷️ Automatic USPS Shipping Labels (Plug &amp; Play)
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(245,239,230,0.55)' }}>
                        Automatically generate 4x6 USPS postage labels the moment a customer orders
                      </p>
                    </div>
                    <a
                      href="https://apps.goshippo.com/settings/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                      style={{ background: 'rgba(232,116,138,0.2)', color: '#e8748a', border: '1px solid rgba(232,116,138,0.4)' }}
                    >
                      Get Free Shippo Token ↗
                    </a>
                  </div>

                  {/* Shippo Status Banner */}
                  <div
                    className="rounded-xl p-4 mb-5 flex flex-wrap items-center justify-between gap-3"
                    style={
                      shippoConfigured
                        ? { background: 'rgba(107, 203, 119, 0.12)', border: '1px solid rgba(107, 203, 119, 0.35)' }
                        : { background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.35)' }
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{shippoConfigured ? '🖨️' : '📬'}</span>
                      <div>
                        <p className="text-sm font-bold" style={{ color: shippoConfigured ? '#6bcb77' : '#38bdf8' }}>
                          {shippoConfigured ? 'Automatic USPS Postage Connected' : 'Packing Slips Ready · Add Shippo for 1-Click USPS Postage'}
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(245,239,230,0.65)' }}>
                          {shippoConfigured
                            ? `Token: ${shippoKeyMasked} — Labels auto-generate when orders arrive!`
                            : 'Large-print Packing Slips work right now with zero setup! Add a free Shippo token below to also buy USPS postage automatically.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestShippo}
                      disabled={testingShippo}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: '#e8748a',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(232,116,138,0.3)',
                      }}
                    >
                      {testingShippo ? 'Testing Shippo...' : shippoKeyInput ? '✓ Verify & Save Token' : '🔄 Test Shippo'}
                    </button>
                  </div>

                  {shippoTestResult && (
                    <div
                      className="rounded-xl p-4 mb-5 text-xs"
                      style={
                        shippoTestResult.valid
                          ? { background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#a7f3d0' }
                          : { background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5' }
                      }
                    >
                      {shippoTestResult.valid ? (
                        <p className="font-bold text-sm text-emerald-300">
                          🎉 Shippo Connected! ({shippoTestResult.mode} MODE · Carriers: {shippoTestResult.carriers})
                        </p>
                      ) : (
                        <p className="font-semibold">❌ {shippoTestResult.error}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.75)' }}>
                        Shippo API Token (Starts with <code className="text-rose-300">shippo_live_</code> or <code className="text-amber-300">shippo_test_</code>)
                      </label>
                      <input
                        type="password"
                        value={shippoKeyInput}
                        onChange={(e) => setShippoKeyInput(e.target.value)}
                        placeholder={shippoConfigured ? `Saved (${shippoKeyMasked}) — Paste new token to replace` : 'shippo_live_...'}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
                        style={inputStyle}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <label className="flex items-center gap-2.5 p-3 rounded-xl cursor-pointer text-xs font-semibold" style={{ background: 'rgba(26,15,36,0.55)', border: '1px solid rgba(232,116,138,0.15)' }}>
                        <input
                          type="checkbox"
                          checked={autoCreateLabel}
                          onChange={(e) => setAutoCreateLabel(e.target.checked)}
                          className="w-4 h-4 accent-[#e8748a] rounded"
                        />
                        <span>⚡ Auto-create label on backend when customer orders</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl cursor-pointer text-xs font-semibold" style={{ background: 'rgba(26,15,36,0.55)', border: '1px solid rgba(232,116,138,0.15)' }}>
                        <input
                          type="checkbox"
                          checked={autoPrintQueue}
                          onChange={(e) => setAutoPrintQueue(e.target.checked)}
                          className="w-4 h-4 accent-[#e8748a] rounded"
                        />
                        <span>🖨️ Show 1-Click &ldquo;Print All Unprinted Labels&rdquo; banner for Bonnie</span>
                      </label>
                    </div>

                    <div className="pt-3 border-t" style={{ borderColor: 'rgba(232,116,138,0.15)' }}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#e8748a' }}>
                        📍 Bonnie&apos;s Return Address (Printed on Labels &amp; Packing Slips)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'rgba(245,239,230,0.65)' }}>Sender Name</label>
                          <input
                            type="text"
                            value={returnName}
                            onChange={(e) => setReturnName(e.target.value)}
                            placeholder="Bonnie's Boutique"
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'rgba(245,239,230,0.65)' }}>Default Package Weight (oz)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={defaultWeightOz}
                            onChange={(e) => setDefaultWeightOz(e.target.value)}
                            placeholder="4.0"
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                            style={inputStyle}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs mb-1" style={{ color: 'rgba(245,239,230,0.65)' }}>Return Street Address</label>
                          <input
                            type="text"
                            value={returnStreet}
                            onChange={(e) => setReturnStreet(e.target.value)}
                            placeholder="123 Crafty Lane"
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'rgba(245,239,230,0.65)' }}>City</label>
                          <input
                            type="text"
                            value={returnCity}
                            onChange={(e) => setReturnCity(e.target.value)}
                            placeholder="Springfield"
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                            style={inputStyle}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs mb-1" style={{ color: 'rgba(245,239,230,0.65)' }}>State</label>
                            <input
                              type="text"
                              value={returnState}
                              onChange={(e) => setReturnState(e.target.value)}
                              placeholder="OH"
                              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                              style={inputStyle}
                            />
                          </div>
                          <div>
                            <label className="block text-xs mb-1" style={{ color: 'rgba(245,239,230,0.65)' }}>ZIP Code</label>
                            <input
                              type="text"
                              value={returnZip}
                              onChange={(e) => setReturnZip(e.target.value)}
                              placeholder="45501"
                              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                              style={inputStyle}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Venmo & PayPal Options */}
                <div
                  className="rounded-2xl p-6"
                  style={{ background: 'rgba(61, 37, 82, 0.5)', border: '1px solid rgba(232,116,138,0.2)' }}
                >
                  <h3 className="text-lg font-bold mb-1" style={{ color: '#f5efe6' }}>
                    📱 Venmo &amp; PayPal Options
                  </h3>
                  <p className="text-xs mb-5" style={{ color: 'rgba(245,239,230,0.55)' }}>
                    Allow customers to also place orders using Venmo or PayPal
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.75)' }}>
                          Venmo Handle
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableVenmo}
                            onChange={(e) => setEnableVenmo(e.target.checked)}
                            className="accent-[#e8748a]"
                          />
                          <span>Enable</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={venmoHandle}
                        onChange={(e) => setVenmoHandle(e.target.value)}
                        placeholder="@BonniesBoutique"
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.75)' }}>
                          PayPal Email / PayPal.Me
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enablePaypal}
                            onChange={(e) => setEnablePaypal(e.target.checked)}
                            className="accent-[#e8748a]"
                          />
                          <span>Enable</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={paypalEmail}
                        onChange={(e) => setPaypalEmail(e.target.value)}
                        placeholder="bonnie@example.com"
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full py-4 rounded-2xl text-base font-bold tracking-wide transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #e8748a, #c44b63)',
                    color: 'white',
                    boxShadow: '0 8px 25px rgba(232,116,138,0.35)',
                  }}
                >
                  {savingSettings ? 'Saving All Settings...' : '💾 Save All Store & Payment Settings'}
                </button>
              </form>

              {/* Card 4: Admin Password Security */}
              <form
                onSubmit={handleChangePassword}
                className="rounded-2xl p-6 mt-6"
                style={{ background: 'rgba(61, 37, 82, 0.5)', border: '1px solid rgba(232,116,138,0.2)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-bold" style={{ color: '#f5efe6' }}>
                    🔒 Admin Password Security
                  </h3>
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(107, 203, 119, 0.15)', color: '#6bcb77', border: '1px solid rgba(107,203,119,0.35)' }}
                  >
                    Password Active
                  </span>
                </div>
                <p className="text-xs mb-5" style={{ color: 'rgba(245,239,230,0.55)' }}>
                  Update the password required to access <code className="text-rose-300">/admin</code>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.75)' }}>
                      New Admin Password
                    </label>
                    <input
                      type="password"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Enter new password..."
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.75)' }}>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmNewPasswordInput}
                      onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                      placeholder="Re-enter new password..."
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingPassword || !newPasswordInput.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  style={{
                    background: 'rgba(232,116,138,0.2)',
                    color: '#e8748a',
                    border: '1px solid rgba(232,116,138,0.4)',
                  }}
                >
                  {savingPassword ? 'Updating Password...' : '🔑 Update Admin Password'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: MANAGE PRODUCTS
           ===================================================================== */}
        {activeTab === 'products' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Total Products', value: counts.all, color: '#e8748a' },
                { label: 'Published Live', value: counts.published, color: '#6bcb77' },
                { label: 'Hidden Drafts', value: counts.draft, color: '#f9c74f' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl p-5"
                  style={{ background: 'rgba(61, 37, 82, 0.5)', border: '1px solid rgba(232,116,138,0.1)' }}
                >
                  <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(245,239,230,0.5)' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Add Product Form */}
              <div className="lg:col-span-1">
                <div
                  className="rounded-2xl p-6 sticky top-24"
                  style={{ background: 'rgba(61, 37, 82, 0.5)', border: '1px solid rgba(232,116,138,0.15)' }}
                >
                  <h2 className="text-lg font-semibold mb-5" style={{ color: '#f5efe6' }}>Add New Trinket</h2>
                  <form onSubmit={handleSubmitProduct} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.6)' }}>Photo</label>
                      <div
                        className="relative border-2 border-dashed rounded-xl overflow-hidden h-40 flex items-center justify-center cursor-pointer"
                        style={{ borderColor: 'rgba(232,116,138,0.3)', background: 'rgba(26,15,36,0.5)' }}
                        onClick={() => document.getElementById('fileInput')?.click()}
                      >
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={preview} alt="Preview" className="w-full h-full object-contain p-2" />
                        ) : (
                          <div className="text-center">
                            <div className="text-3xl mb-2">📷</div>
                            <p className="text-xs" style={{ color: 'rgba(245,239,230,0.4)' }}>Click to upload image</p>
                          </div>
                        )}
                      </div>
                      <input id="fileInput" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.6)' }}>Title *</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={inputStyle}
                        placeholder="e.g. Spooky Pumpkin Pen"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.6)' }}>Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                        style={inputStyle}
                        placeholder="Describe this trinket..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1 uppercase tracking-wider" style={{ color: 'rgba(245,239,230,0.6)' }}>Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={inputStyle}
                      />
                    </div>

                    <button
                      disabled={loading}
                      type="submit"
                      className="btn-primary w-full py-3 rounded-xl text-sm font-semibold tracking-wide"
                      style={{ background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white' }}
                    >
                      {loading ? 'Adding...' : '+ Add Product'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Product List */}
              <div className="lg:col-span-2">
                <div className="flex flex-wrap gap-3 mb-6">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 min-w-[180px] px-4 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'rgba(61,37,82,0.5)', border: '1px solid rgba(232,116,138,0.2)', color: '#f5efe6' }}
                  />
                  {(['all', 'published', 'draft'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className="px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all"
                      style={
                        filter === f
                          ? { background: '#e8748a', color: 'white' }
                          : { background: 'rgba(61,37,82,0.5)', color: 'rgba(245,239,230,0.6)', border: '1px solid rgba(232,116,138,0.15)' }
                      }
                    >
                      {f} ({counts[f]})
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filtered.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl overflow-hidden group flex flex-col justify-between"
                      style={{ background: 'rgba(61,37,82,0.5)', border: '1px solid rgba(232,116,138,0.1)' }}
                    >
                      <div>
                        <div className="relative aspect-square" style={{ background: '#2d1b3d' }}>
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt={p.title} loading="lazy" className="w-full h-full object-contain p-3" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">🔑</div>
                          )}
                          {p.isDraft && (
                            <span
                              className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full"
                              style={{ background: '#f9c74f', color: '#1a0f24', fontWeight: 600 }}
                            >
                              Draft
                            </span>
                          )}
                        </div>

                        <div className="p-3">
                          {editingId === p.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full px-2 py-1 rounded text-xs"
                                style={inputStyle}
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-full px-2 py-1 rounded text-xs"
                                style={inputStyle}
                              />
                              <textarea
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                rows={2}
                                placeholder="Description..."
                                className="w-full px-2 py-1 rounded text-xs"
                                style={inputStyle}
                              />
                              <div className="flex gap-1.5 pt-1">
                                <button
                                  onClick={() => saveEditProduct(p)}
                                  className="flex-1 py-1 rounded text-xs font-bold"
                                  style={{ background: '#6bcb77', color: '#1a0f24' }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-2 py-1 rounded text-xs"
                                  style={{ background: 'rgba(255,255,255,0.1)', color: '#f5efe6' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-xs font-medium truncate" style={{ color: '#f5efe6' }}>{p.title}</p>
                              <p className="text-sm font-bold mt-1" style={{ color: '#e8748a' }}>${(p.price ?? 8).toFixed(2)}</p>
                            </>
                          )}
                        </div>
                      </div>

                      {editingId !== p.id && (
                        <div className="px-3 pb-3 flex gap-1.5">
                          <button
                            onClick={() => startEditingProduct(p)}
                            className="px-2.5 text-xs py-1.5 rounded-lg transition-all"
                            style={{ background: 'rgba(245,239,230,0.1)', color: '#f5efe6' }}
                            title="Edit title or price"
                          >
                            ✎ Edit
                          </button>
                          <button
                            onClick={() => handleToggleDraft(p)}
                            className="flex-1 text-xs py-1.5 rounded-lg transition-all"
                            style={
                              p.isDraft
                                ? { background: 'rgba(107, 203, 119, 0.15)', color: '#6bcb77', border: '1px solid rgba(107,203,119,0.3)' }
                                : { background: 'rgba(249, 199, 79, 0.15)', color: '#f9c74f', border: '1px solid rgba(249,199,79,0.3)' }
                            }
                          >
                            {p.isDraft ? 'Publish' : 'Hide'}
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="px-2.5 text-xs py-1.5 rounded-lg transition-all"
                            style={{ background: 'rgba(232,116,138,0.1)', color: '#e8748a', border: '1px solid rgba(232,116,138,0.2)' }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <div className="col-span-full py-16 text-center" style={{ color: 'rgba(245,239,230,0.3)' }}>
                      No products found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* =====================================================================
            TAB 3: CUSTOMER ORDERS
           ===================================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#f5efe6' }}>Customer Orders &amp; Easy Shipping</h2>
                <p className="text-xs" style={{ color: 'rgba(245,239,230,0.5)' }}>
                  Every checkout is logged here. Click &ldquo;Print Packing Slip&rdquo; or &ldquo;Print USPS Postage Label&rdquo; to box &amp; ship!
                </p>
              </div>
              <button
                onClick={fetchOrders}
                className="px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(232,116,138,0.15)', color: '#e8748a', border: '1px solid rgba(232,116,138,0.3)' }}
              >
                🔄 Refresh Orders
              </button>
            </div>

            {/* Auto-Print Queue Banner for Bonnie */}
            {autoPrintQueue && orders.some((o) => !o.labelPrinted && o.paymentStatus !== 'fulfilled') && (
              <div
                className="rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4"
                style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(56, 189, 248, 0.15))', border: '1px solid rgba(16, 185, 129, 0.45)' }}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-3xl">🖨️</span>
                  <div>
                    <p className="text-base font-bold text-emerald-300">
                      {orders.filter((o) => !o.labelPrinted && o.paymentStatus !== 'fulfilled').length} New Order(s) Ready to Box &amp; Print!
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(245,239,230,0.75)' }}>
                      Click the big button on the right to open &amp; print your next unprinted label / packing slip.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const nextOrder = orders.find((o) => !o.labelPrinted && o.paymentStatus !== 'fulfilled');
                    if (!nextOrder) return;
                    if (nextOrder.labelUrl) {
                      window.open(nextOrder.labelUrl, '_blank');
                      handleMarkLabelPrinted(nextOrder.id, true);
                    } else {
                      handlePrintPackingSlip(nextOrder);
                    }
                  }}
                  className="px-5 py-3 rounded-xl text-sm font-bold shadow-lg transition-all"
                  style={{ background: '#10b981', color: '#052e16' }}
                >
                  🖨️ Print Next Order Label &amp; Mark Printed
                </button>
              </div>
            )}

            {ordersLoading ? (
              <div className="py-16 text-center text-sm" style={{ color: 'rgba(245,239,230,0.5)' }}>
                Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <div
                className="rounded-2xl py-16 px-6 text-center"
                style={{ background: 'rgba(61,37,82,0.35)', border: '1px solid rgba(232,116,138,0.15)' }}
              >
                <div className="text-4xl mb-3">📭</div>
                <p className="text-base font-semibold" style={{ color: '#f5efe6' }}>No orders yet</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(245,239,230,0.45)' }}>
                  When customers place orders on your store, they will appear right here!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  let parsedItems: OrderItem[] = [];
                  try {
                    parsedItems = JSON.parse(order.itemsJson);
                  } catch (_e) {}

                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl p-5 flex flex-col lg:flex-row justify-between gap-6"
                      style={{ background: 'rgba(61,37,82,0.45)', border: '1px solid rgba(232,116,138,0.2)' }}
                    >
                      <div className="space-y-2.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-base font-bold" style={{ color: '#f5efe6' }}>
                            {order.customerName}
                          </span>
                          <span
                            className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase"
                            style={
                              order.paymentStatus === 'paid' || order.paymentStatus === 'fulfilled'
                                ? { background: 'rgba(107,203,119,0.2)', color: '#6bcb77' }
                                : { background: 'rgba(249,199,79,0.2)', color: '#f9c74f' }
                            }
                          >
                            {order.paymentStatus}
                          </span>
                          <span
                            className="text-xs px-2.5 py-0.5 rounded-full uppercase"
                            style={{ background: 'rgba(232,116,138,0.15)', color: '#e8748a' }}
                          >
                            Via {order.paymentMethod}
                          </span>
                          {order.labelUrl && (
                            <span
                              className="text-xs px-2.5 py-0.5 rounded-full font-bold"
                              style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.35)' }}
                            >
                              🏷️ USPS Label Auto-Created {order.labelRate ? `($${order.labelRate.toFixed(2)})` : ''}
                            </span>
                          )}
                          {order.labelPrinted && (
                            <span
                              className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(245,239,230,0.7)' }}
                            >
                              ✓ Printed
                            </span>
                          )}
                          <span className="text-xs" style={{ color: 'rgba(245,239,230,0.45)' }}>
                            {new Date(order.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <p className="text-xs" style={{ color: 'rgba(245,239,230,0.75)' }}>
                          📧 {order.customerEmail} {order.customerPhone ? ` · 📞 ${order.customerPhone}` : ''}
                        </p>
                        <p className="text-sm" style={{ color: '#f5efe6' }}>
                          📍 <strong>Ship to:</strong> {order.shippingAddress}
                        </p>

                        {order.trackingNumber && (
                          <p className="text-xs" style={{ color: '#6ee7b7' }}>
                            🚚 <strong>Tracking ({order.labelCarrier || 'USPS'}):</strong>{' '}
                            {order.trackingUrl ? (
                              <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline font-mono">
                                {order.trackingNumber} ↗
                              </a>
                            ) : (
                              <span className="font-mono">{order.trackingNumber}</span>
                            )}
                          </p>
                        )}

                        {order.labelError && !order.labelUrl && (
                          <p className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(249,199,79,0.12)', color: '#fde68a', border: '1px solid rgba(249,199,79,0.25)' }}>
                            ℹ️ {order.labelError}
                          </p>
                        )}

                        <div className="pt-2 flex flex-wrap gap-2">
                          {parsedItems.map((item, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-3 py-1.5 rounded-lg font-medium"
                              style={{ background: 'rgba(26,15,36,0.65)', color: '#f5efe6', border: '1px solid rgba(232,116,138,0.15)' }}
                            >
                              {item.quantity}x {item.title} (${item.price.toFixed(2)})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col justify-between items-start lg:items-end gap-3 min-w-[240px]">
                        <div className="text-left lg:text-right">
                          <p className="text-xs" style={{ color: 'rgba(245,239,230,0.5)' }}>
                            Subtotal: ${order.subtotal.toFixed(2)} · Shipping: ${order.shippingCost.toFixed(2)}
                          </p>
                          <p className="text-xl font-bold mt-0.5" style={{ color: '#e8748a' }}>
                            Total: ${order.total.toFixed(2)}
                          </p>
                        </div>

                        {/* Big Plug & Play Label & Packing Slip Buttons for Bonnie */}
                        <div className="flex flex-wrap gap-2 w-full lg:justify-end">
                          <button
                            onClick={() => handlePrintPackingSlip(order)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            style={{ background: 'rgba(245,239,230,0.12)', color: '#f5efe6', border: '1px solid rgba(245,239,230,0.3)' }}
                          >
                            🖨️ Print Packing Slip &amp; Address
                          </button>

                          {order.labelUrl ? (
                            <a
                              href={order.labelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleMarkLabelPrinted(order.id, true)}
                              className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                            >
                              🏷️ Print 4x6 USPS Postage Label ↗
                            </a>
                          ) : (
                            <button
                              onClick={() => handleBuyShippingLabel(order)}
                              disabled={creatingLabelOrderId === order.id}
                              className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                              style={{ background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white', boxShadow: '0 4px 12px rgba(232,116,138,0.3)' }}
                            >
                              {creatingLabelOrderId === order.id ? 'Creating USPS Label...' : '🏷️ Buy & Print USPS Label'}
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {order.paymentStatus !== 'paid' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'paid')}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                              style={{ background: 'rgba(107,203,119,0.2)', color: '#6bcb77', border: '1px solid rgba(107,203,119,0.4)' }}
                            >
                              ✓ Mark Paid
                            </button>
                          )}
                          {order.paymentStatus !== 'fulfilled' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'fulfilled')}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                              style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.4)' }}
                            >
                              📦 Mark Shipped
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs"
                            style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
