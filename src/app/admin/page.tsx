'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import BonniesDailyActionCenter from './components/BonniesDailyActionCenter';
import AutoMagicProductUploader from './components/AutoMagicProductUploader';
import { PrintableOrder } from './utils/batchPrintPackingSlips';
import {
  getProductCategory,
  getCategoryCounts,
  ProductCategory,
  CATEGORIES,
  PRODUCT_CATEGORIES,
  applyCategoryTag,
  stripCategoryTag,
} from '@/lib/categories';

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
  id?: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
};

type Order = PrintableOrder & {
  labelError?: string | null;
  labelRate?: number | null;
  labelCarrier?: string | null;
  labelStatus?: string | null;
  labelPrinted: boolean;
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'settings' | 'products' | 'orders'>('settings');

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('All');
  const [search, setSearch] = useState('');

  // Local state for inline price editing values per product id
  const [inlinePrices, setInlinePrices] = useState<Record<string, string>>({});
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);

  // Full Edit Product state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState<ProductCategory>('Keychains');

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
  const [hasAdminPin, setHasAdminPin] = useState(true);
  const [adminPin, setAdminPin] = useState('');
  const [loginInput, setLoginInput] = useState('');
  const [setupConfirmInput, setSetupConfirmInput] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSetupConfirm, setShowSetupConfirm] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Change Password inside Settings state
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
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
  const [activeAddressSource, setActiveAddressSource] = useState<string>('none');
  const [defaultWeightOz, setDefaultWeightOz] = useState('4.0');
  const [testingShippo, setTestingShippo] = useState(false);
  const [shippoTestResult, setShippoTestResult] = useState<{
    valid: boolean;
    mode?: string;
    carriers?: string;
    error?: string;
  } | null>(null);
  const [creatingLabelOrderId, setCreatingLabelOrderId] = useState<string | null>(null);

  // Gemini AI Vision Configuration state
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [geminiKeyMasked, setGeminiKeyMasked] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [geminiKeySource, setGeminiKeySource] = useState<'database' | 'env' | 'none'>('none');
  const [savingGemini, setSavingGemini] = useState(false);

  const getStoredPin = () => {
    if (typeof window === 'undefined') return '';
    return (
      sessionStorage.getItem('bonnies_admin_pin') ||
      localStorage.getItem('bonnies_admin_pin') ||
      ''
    );
  };

  const persistPin = (pinVal: string) => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('bonnies_admin_pin', pinVal);
    try {
      localStorage.setItem('bonnies_admin_pin', pinVal);
    } catch {}
  };

  const clearStoredPin = () => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('bonnies_admin_pin');
    try {
      localStorage.removeItem('bonnies_admin_pin');
    } catch {}
  };

  useEffect(() => {
    const savedPin = getStoredPin();
    checkAdminAuth(savedPin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 6000);
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
    setActiveAddressSource(
      (data.activeAddressSource as string) ||
        (data.returnStreet ? 'admin_settings' : 'none')
    );
    setDefaultWeightOz(String(data.defaultWeightOz ?? 4.0));
    setGeminiConfigured(Boolean(data.geminiConfigured));
    setGeminiKeyMasked((data.geminiKeyMasked as string) || '');
    setGeminiKeySource(((data.geminiKeySource as string) || 'none') as 'database' | 'env' | 'none');
  };

  const checkAdminAuth = async (pinToTry: string) => {
    setAuthChecking(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/settings?admin=true', {
        headers: pinToTry ? { 'x-admin-pin': pinToTry } : {},
      });
      const data = await res.json();
      if (res.status === 401 || data.requiresAuth) {
        setHasAdminPin(true);
        setIsAuthenticated(false);
        clearStoredPin();
      } else if (!data.error) {
        applySettingsData(data);
        if (data.hasAdminPin !== false) {
          setHasAdminPin(true);
          setAdminPin(pinToTry);
          setIsAuthenticated(true);
          fetchProducts();
          fetchOrders();
        } else {
          // No password configured yet -> prompt first-time password creation
          setHasAdminPin(false);
          setIsAuthenticated(false);
        }
      } else {
        // On server error, keep password login screen active
        setHasAdminPin(true);
        setIsAuthenticated(false);
      }
    } catch (_e) {
      setHasAdminPin(true);
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
          // If an admin password already exists, automatically try logging in with the entered password!
          setHasAdminPin(true);
          const verifyRes = await fetch('/api/settings?admin=true', {
            headers: { 'x-admin-pin': trimmed },
          });
          const verifyData = await verifyRes.json();
          if (!verifyData.requiresAuth && !verifyData.error) {
            persistPin(trimmed);
            setAdminPin(trimmed);
            applySettingsData(verifyData);
            setIsAuthenticated(true);
            setLoginInput('');
            setSetupConfirmInput('');
            fetchProducts();
            fetchOrders();
            showToast("🔓 Hello Bonnie! Welcome to your Boutique Manager.");
            return;
          }
          setAuthError('An admin password is already set. Please enter your admin password to sign in.');
          setAuthSubmitting(false);
          return;
        }

        persistPin(trimmed);
        setAdminPin(trimmed);
        setHasAdminPin(true);
        setIsAuthenticated(true);
        setLoginInput('');
        setSetupConfirmInput('');
        fetchProducts();
        fetchOrders();
        showToast('🔒 Admin password created! Welcome to your Boutique Manager.');
      } else {
        // Verify existing password
        const res = await fetch('/api/settings?admin=true', {
          headers: { 'x-admin-pin': trimmed },
        });
        const data = await res.json();
        if (data.requiresAuth) {
          setAuthError('Incorrect password. Please try again.');
        } else if (!data.error) {
          persistPin(trimmed);
          setAdminPin(trimmed);
          applySettingsData(data);
          setIsAuthenticated(true);
          setLoginInput('');
          fetchProducts();
          fetchOrders();
          showToast("🔓 Hello Bonnie! Welcome to your Boutique Manager.");
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
    clearStoredPin();
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
        persistPin(trimmed);
        setNewPasswordInput('');
        setConfirmNewPasswordInput('');
        showToast('🔒 Admin password updated successfully!');
      } else {
        showToast('⚠️ ' + (data.error || 'Failed to update password'));
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (_e) {}
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const pin = adminPin || getStoredPin();
      const res = await fetch('/api/orders', {
        cache: 'no-store',
        headers: pin ? { 'x-admin-pin': pin } : {},
      });
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
      if (geminiKeyInput.trim() !== '') {
        payload.geminiApiKey = geminiKeyInput.trim();
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
        setGeminiConfigured(Boolean(data.geminiConfigured));
        setGeminiKeyMasked(data.geminiKeyMasked || '');
        if (data.geminiKeySource) {
          setGeminiKeySource(data.geminiKeySource as 'database' | 'env' | 'none');
        }
        setGeminiKeyInput('');
        if (data.activeAddressSource) {
          setActiveAddressSource(data.activeAddressSource);
        }
        showToast('✓ Store, Stripe, Shipping & Gemini settings saved!');
      } else {
        showToast('⚠️ ' + (data.error || 'Could not save settings'));
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiKeyInput.trim()) return;
    setSavingGemini(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify({
          verifyPin: adminPin,
          geminiApiKey: geminiKeyInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeminiConfigured(Boolean(data.geminiConfigured));
        setGeminiKeyMasked(data.geminiKeyMasked || '');
        if (data.geminiKeySource) {
          setGeminiKeySource(data.geminiKeySource as 'database' | 'env' | 'none');
        }
        setGeminiKeyInput('');
        showToast('✓ Gemini Vision API key updated & saved successfully!');
      } else {
        showToast('⚠️ ' + (data.error || 'Failed to update Gemini key'));
      }
    } catch (_e) {
      showToast('⚠️ Network error while saving Gemini key.');
    } finally {
      setSavingGemini(false);
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
          if (saveData.activeAddressSource) {
            setActiveAddressSource(saveData.activeAddressSource);
          }
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
      const pin = adminPin || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bonnies_admin_pin') || '' : '');
      const res = await fetch('/api/orders/label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pin ? { 'x-admin-pin': pin } : {}),
        },
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
    const pin = adminPin || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bonnies_admin_pin') || '' : '');
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(pin ? { 'x-admin-pin': pin } : {}),
      },
      body: JSON.stringify({ id: orderId, labelPrinted: printed }),
    });
    fetchOrders();
  };

  const handleBatchMarkOrdersPrinted = async (orderIds: string[]) => {
    const pin = adminPin || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bonnies_admin_pin') || '' : '');
    await Promise.all(
      orderIds.map((id) =>
        fetch('/api/orders', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(pin ? { 'x-admin-pin': pin } : {}),
          },
          body: JSON.stringify({ id, labelPrinted: true }),
        })
      )
    );
    await fetchOrders();
    showToast(`🎉 Printed & marked ready ${orderIds.length} order(s)!`);
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
            ✂ Cut out and tape to package
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

  const startEditingProduct = (p: Product) => {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditPrice(String(p.price ?? 8));
    setEditDesc(stripCategoryTag(p.description));
    setEditCategory(getProductCategory(p.title, p.description));
  };

  const saveEditProduct = async (p: Product) => {
    const pin = adminPin || getStoredPin();
    const parsedPrice = parseFloat(editPrice) || 8;
    const taggedDesc = applyCategoryTag(editTitle, editDesc, editCategory);
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(pin ? { 'x-admin-pin': pin } : {}),
        },
        body: JSON.stringify({
          ...p,
          title: editTitle,
          price: parsedPrice,
          description: taggedDesc,
        }),
      });
      if (res.status === 401) {
        clearStoredPin();
        setIsAuthenticated(false);
        showToast('⚠️ Session expired — please enter your password again.');
        return;
      }
      if (!res.ok) {
        showToast('⚠️ Could not save product changes. Please try again.');
        return;
      }
      setEditingId(null);
      await fetchProducts();
      showToast('✓ Product updated!');
    } catch (_e) {
      showToast('⚠️ Network error saving product.');
    }
  };

  // 1-Click Inline Price Edit Handler
  const handleInlinePriceSave = async (p: Product, newPriceVal: number | string) => {
    const num = typeof newPriceVal === 'number' ? newPriceVal : parseFloat(newPriceVal);
    if (isNaN(num) || num < 0) {
      showToast('⚠️ Please enter a valid price (must be 0 or greater).');
      return;
    }
    const rounded = Math.round(num * 100) / 100;
    setSavingPriceId(p.id);
    try {
      const pin = adminPin || getStoredPin();
      const res = await fetch(`/api/products/${p.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(pin ? { 'x-admin-pin': pin } : {}),
        },
        body: JSON.stringify({ ...p, price: rounded }),
      });
      if (res.status === 401) {
        clearStoredPin();
        setIsAuthenticated(false);
        showToast('⚠️ Session expired — please enter your password again.');
        return;
      }
      const data = await res.json();
      if (res.ok && data && !data.error) {
        setProducts((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, price: rounded } : item))
        );
        // Clear local override so default value updates
        setInlinePrices((prev) => {
          const next = { ...prev };
          delete next[p.id];
          return next;
        });
        showToast(`✓ Price updated to $${rounded.toFixed(2)} for ${p.title}`);
      } else {
        showToast('⚠️ ' + (data.error || 'Failed to update price'));
      }
    } catch (_e) {
      showToast('⚠️ Network error saving price.');
    } finally {
      setSavingPriceId(null);
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!confirm(`Are you sure you want to permanently delete "${p.title}"? This cannot be undone.`)) {
      return;
    }
    const pin = adminPin || getStoredPin();
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: 'DELETE',
        headers: pin ? { 'x-admin-pin': pin } : {},
      });
      if (res.status === 401) {
        clearStoredPin();
        setIsAuthenticated(false);
        showToast('⚠️ Session expired — please enter your password again to delete items.');
        return;
      }
      if (!res.ok) {
        showToast(`⚠️ Failed to delete "${p.title}". Please try again.`);
        return;
      }
      setProducts((prev) => prev.filter((item) => item.id !== p.id));
      await fetchProducts();
      showToast(`✓ Deleted "${p.title}" from store.`);
    } catch (_e) {
      showToast('⚠️ Network error deleting product. Please check your connection.');
    }
  };

  const handleToggleDraft = async (p: Product) => {
    const pin = adminPin || getStoredPin();
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(pin ? { 'x-admin-pin': pin } : {}),
        },
        body: JSON.stringify({ ...p, isDraft: !p.isDraft }),
      });
      if (res.status === 401) {
        clearStoredPin();
        setIsAuthenticated(false);
        showToast('⚠️ Session expired — please enter your password again.');
        return;
      }
      if (!res.ok) {
        showToast('⚠️ Failed to update product visibility. Please try again.');
        return;
      }
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, isDraft: !p.isDraft } : item))
      );
      await fetchProducts();
      showToast(p.isDraft ? '✓ Product published live to store!' : '🔒 Product hidden (saved as Draft).');
    } catch (_e) {
      showToast('⚠️ Network error updating product visibility.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, paymentStatus: string) => {
    const pin = adminPin || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bonnies_admin_pin') || '' : '');
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(pin ? { 'x-admin-pin': pin } : {}),
      },
      body: JSON.stringify({ id: orderId, paymentStatus }),
    });
    fetchOrders();
    showToast(`✓ Order marked as ${paymentStatus}!`);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Delete this order record?')) return;
    const pin = adminPin || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('bonnies_admin_pin') || '' : '');
    await fetch(`/api/orders?id=${orderId}`, {
      method: 'DELETE',
      headers: pin ? { 'x-admin-pin': pin } : {},
    });
    fetchOrders();
    showToast('Order deleted.');
  };

  // Live Category Counts using shared categories utility
  const categoryCounts = getCategoryCounts(products);

  // Filter products by draft status, category, and keyword search (matches title and description)
  const filtered = products
    .filter((p) => {
      if (filter === 'draft') return p.isDraft;
      if (filter === 'published') return !p.isDraft;
      return true;
    })
    .filter((p) => {
      if (selectedCategory === 'All') return true;
      return getProductCategory(p.title, p.description) === selectedCategory;
    })
    .filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const matchesTitle = p.title.toLowerCase().includes(q);
      const matchesDesc = p.description ? p.description.toLowerCase().includes(q) : false;
      return matchesTitle || matchesDesc;
    });

  const counts = {
    all: products.length,
    published: products.filter((p) => !p.isDraft).length,
    draft: products.filter((p) => p.isDraft).length,
  };

  const inputStyle = {
    background: 'rgba(26,15,36,0.85)',
    border: '2px solid rgba(232,116,138,0.35)',
    color: '#f5efe6',
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a0f24' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#e8748a] border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-bold tracking-wider uppercase text-rose-300">
            Verifying Admin Access...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#1a0f24', color: '#f5efe6' }}>
        <div
          className="w-full max-w-lg rounded-3xl p-8 sm:p-10 shadow-2xl transition-all"
          style={{ background: 'rgba(61, 37, 82, 0.75)', border: '2px solid rgba(232,116,138,0.45)', backdropFilter: 'blur(20px)' }}
        >
          {/* Header & Warm Grandma Greeting */}
          <div className="flex flex-col items-center text-center mb-8">
            <Image src="/bt_logo.jpg" alt="B&T Trinkets" width={84} height={84} className="object-contain rounded-2xl mb-4 shadow-lg" unoptimized />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
              {hasAdminPin ? "Bonnie's Boutique Admin" : 'Set Up Admin Password'}
            </h1>
            <div className="rounded-xl px-4 py-2 mt-1 mb-2 bg-rose-500/15 border border-rose-400/30">
              <p className="text-base font-semibold text-rose-200">
                👵 Hello Bonnie! Welcome to your Boutique Manager.
              </p>
            </div>
            <p className="text-sm font-medium mt-1 leading-relaxed" style={{ color: 'rgba(245,239,230,0.85)' }}>
              {hasAdminPin
                ? 'Enter your admin password below to open your store controls.'
                : 'Welcome! Create a password below to protect your settings, products, and customer orders.'}
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold uppercase tracking-wider text-rose-200">
                  {hasAdminPin ? 'Admin Password' : 'Create Admin Password'}
                </label>
                {/* 1-Click Show / Hide Password Toggle */}
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer"
                  style={{
                    background: showLoginPassword ? 'rgba(232,116,138,0.3)' : 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(232,116,138,0.4)',
                    color: '#f5efe6',
                  }}
                >
                  <span>{showLoginPassword ? '🙈' : '👁️'}</span>
                  <span>{showLoginPassword ? 'Hide Password' : 'Show Password'}</span>
                </button>
              </div>

              <input
                type={showLoginPassword ? 'text' : 'password'}
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder={hasAdminPin ? 'Type your password here...' : 'Choose a password (min 4 chars)...'}
                autoFocus
                required
                className="w-full px-5 py-4 rounded-2xl text-lg font-bold outline-none transition-all focus:border-rose-400"
                style={inputStyle}
              />
            </div>

            {!hasAdminPin && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold uppercase tracking-wider text-rose-200">
                    Confirm Admin Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSetupConfirm(!showSetupConfirm)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer"
                    style={{
                      background: showSetupConfirm ? 'rgba(232,116,138,0.3)' : 'rgba(255,255,255,0.08)',
                      borderColor: 'rgba(232,116,138,0.4)',
                      color: '#f5efe6',
                    }}
                  >
                    <span>{showSetupConfirm ? '🙈' : '👁️'}</span>
                    <span>{showSetupConfirm ? 'Hide Password' : 'Show Password'}</span>
                  </button>
                </div>
                <input
                  type={showSetupConfirm ? 'text' : 'password'}
                  value={setupConfirmInput}
                  onChange={(e) => setSetupConfirmInput(e.target.value)}
                  placeholder="Re-type your password to confirm..."
                  required
                  className="w-full px-5 py-4 rounded-2xl text-lg font-bold outline-none transition-all focus:border-rose-400"
                  style={inputStyle}
                />
              </div>
            )}

            {authError && (
              <div
                className="rounded-2xl px-5 py-3.5 text-sm font-bold flex items-center gap-2"
                style={{ background: 'rgba(239, 68, 68, 0.2)', border: '2px solid rgba(239, 68, 68, 0.5)', color: '#fca5a5' }}
              >
                <span className="text-lg">⚠️</span>
                <span>{authError}</span>
              </div>
            )}

            {/* High-Contrast Large 48px+ Unlock Button */}
            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full min-h-[52px] h-[52px] rounded-2xl text-base font-extrabold tracking-wide transition-all shadow-xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #e8748a, #c44b63)',
                color: 'white',
                boxShadow: '0 8px 25px rgba(232,116,138,0.45)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              {authSubmitting
                ? 'Verifying Password...'
                : hasAdminPin
                ? '🔓 Unlock Admin Dashboard'
                : '🔒 Save Password & Enter Admin'}
            </button>
          </form>

          <div className="mt-8 pt-5 border-t text-center" style={{ borderColor: 'rgba(232,116,138,0.2)' }}>
            <Link href="/" className="text-sm font-semibold text-rose-300 hover:text-white underline">
              ← Return to Bonnie&apos;s Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-100 font-sans" style={{ background: '#1a0f24' }}>
      {/* Toast Notification (Accessible with explicit close button) */}
      {toast && (
        <div
          role="status"
          className="fixed top-5 right-5 z-[100] max-w-md px-6 py-4 rounded-2xl text-base font-bold shadow-2xl flex items-center justify-between gap-4 transition-all animate-bounce"
          style={{ background: '#e8748a', color: 'white', border: '2px solid white' }}
        >
          <div className="flex items-center gap-2">
            <span>{toast}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white hover:text-black font-extrabold text-lg px-2 py-1 rounded"
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <header
        className="sticky top-0 z-50 py-4 px-6 sm:px-8 flex flex-wrap justify-between items-center gap-4 shadow-lg"
        style={{
          background: 'rgba(26, 15, 36, 0.96)',
          backdropFilter: 'blur(16px)',
          borderBottom: '2px solid rgba(232, 116, 138, 0.3)',
        }}
      >
        <div className="flex items-center gap-3.5">
          <Image src="/bt_logo.jpg" alt="B&T Trinkets" width={64} height={64} className="object-contain rounded-xl w-14 h-14 shadow-md" unoptimized />
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white">Bonnie&apos;s Boutique Admin</h1>
            <p className="text-xs sm:text-sm font-semibold" style={{ color: 'rgba(245,239,230,0.85)' }}>
              Easy Plug &amp; Play Store Manager
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="text-xs sm:text-sm px-3.5 py-2 rounded-xl font-bold flex items-center gap-2"
            style={
              stripeConfigured
                ? { background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: '1px solid #10b981' }
                : { background: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', border: '1px solid #f59e0b' }
            }
          >
            <span>{stripeConfigured ? '🟢' : '🟡'}</span>
            <span>{stripeConfigured ? 'Stripe Active' : 'Stripe Key Needed'}</span>
          </span>

          <Link
            href="/studio"
            className="text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl border transition-all hover:bg-white/10 flex items-center gap-1.5"
            style={{ borderColor: 'rgba(232, 116, 138, 0.5)', background: 'rgba(232, 116, 138, 0.15)', color: '#f5efe6' }}
            title="Open Bonnie & Tammy's Trinket Tales Studio"
          >
            <span>🎬</span>
            <span>Studio ↗</span>
          </Link>

          <Link
            href="/"
            className="text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl border transition-all hover:bg-white/10"
            style={{ borderColor: 'rgba(245, 239, 230, 0.4)', color: '#f5efe6' }}
          >
            ← View Live Store
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl border transition-all hover:bg-white/10 cursor-pointer"
            style={{ borderColor: 'rgba(232, 116, 138, 0.5)', color: '#fca5a5' }}
          >
            🔒 Lock
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* =====================================================================
            TOP-OF-PAGE: 👵 BONNIE'S DAILY ACTION CENTER BANNER
            Prominently rendered across ALL tabs (Settings, Products, Orders)
            whenever there are unprinted orders waiting.
           ===================================================================== */}
        <BonniesDailyActionCenter
          orders={orders}
          returnAddress={{ returnName, returnStreet, returnCity, returnState, returnZip }}
          onOrdersPrinted={handleBatchMarkOrdersPrinted}
          onJumpToOrders={() => setActiveTab('orders')}
        />

        {/* =====================================================================
            BONNIE & TAMMY'S TRINKET TALES STUDIO QUICK-LAUNCH BANNER
           ===================================================================== */}
        <div
          className="mb-6 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(232, 116, 138, 0.22), rgba(61, 37, 82, 0.55))',
            border: '2px solid rgba(232, 116, 138, 0.45)',
          }}
        >
          <div className="flex items-center gap-3.5">
            <span className="text-3xl sm:text-4xl">🎬</span>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                Bonnie &amp; Tammy&apos;s Trinket Tales Studio
              </h3>
              <p className="text-xs sm:text-sm font-medium" style={{ color: 'rgba(245, 239, 230, 0.9)' }}>
                Generate 9:16 vertical 16-bit animations, skits &amp; 24/7 cozy lo-fi loops for TikTok, Instagram Reels &amp; YouTube Shorts!
              </p>
            </div>
          </div>
          <Link
            href="/studio"
            className="min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm sm:text-base flex items-center gap-2 transition-all hover:scale-[1.02] shadow-md cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #e8748a, #c44b63)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            <span>Open Animation Studio ↗</span>
          </Link>
        </div>

        {/* Main Navigation Tabs */}
        <div className="flex flex-wrap gap-3 mb-8 border-b pb-5" style={{ borderColor: 'rgba(232,116,138,0.2)' }}>
          {[
            { id: 'settings', label: '💳 Plug & Play Stripe & Shipping', badge: stripeConfigured ? 'Ready' : 'Setup' },
            { id: 'products', label: '🛍️ Manage Products', badge: String(counts.published) },
            { id: 'orders', label: '📦 Customer Orders', badge: String(orders.length) },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'settings' | 'products' | 'orders')}
              className="min-h-[48px] px-6 py-3 rounded-2xl text-base font-bold flex items-center gap-3 transition-all cursor-pointer"
              style={
                activeTab === tab.id
                  ? { background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white', boxShadow: '0 6px 20px rgba(232,116,138,0.4)', border: '2px solid rgba(255,255,255,0.3)' }
                  : { background: 'rgba(61, 37, 82, 0.5)', color: 'rgba(245,239,230,0.85)', border: '2px solid rgba(232,116,138,0.2)' }
              }
            >
              <span>{tab.label}</span>
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-bold"
                style={{
                  background: activeTab === tab.id ? 'rgba(0,0,0,0.35)' : 'rgba(232,116,138,0.2)',
                  color: activeTab === tab.id ? 'white' : '#f5efe6',
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
                className="rounded-3xl p-6 sm:p-7 shadow-xl"
                style={{ background: 'rgba(61, 37, 82, 0.6)', border: '2px solid rgba(232,116,138,0.3)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">✨</span>
                  <h2 className="text-lg font-bold text-white">
                    3-Step Stripe Plug &amp; Play
                  </h2>
                </div>
                <p className="text-sm font-medium leading-relaxed mb-6" style={{ color: 'rgba(245,239,230,0.85)' }}>
                  No coding or server restart needed! Paste your Stripe key on this page and your store will immediately accept credit cards &amp; Apple Pay.
                </p>

                <ol className="space-y-4 text-sm font-medium">
                  <li className="p-4 rounded-2xl" style={{ background: 'rgba(26,15,36,0.7)', border: '1px solid rgba(232,116,138,0.25)' }}>
                    <p className="font-bold text-rose-300 text-base mb-1">1. Open Your Stripe API Keys</p>
                    <p className="mb-3 text-sm leading-relaxed" style={{ color: 'rgba(245,239,230,0.85)' }}>
                      Log into your Stripe account and tap the button below to go straight to your keys page:
                    </p>
                    <a
                      href="https://dashboard.stripe.com/apikeys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block w-full text-center py-2.5 px-4 rounded-xl font-bold transition-all"
                      style={{ background: 'rgba(232,116,138,0.25)', color: '#f5efe6', border: '1px solid rgba(232,116,138,0.5)' }}
                    >
                      Open Stripe API Keys ↗
                    </a>
                  </li>

                  <li className="p-4 rounded-2xl" style={{ background: 'rgba(26,15,36,0.7)', border: '1px solid rgba(232,116,138,0.25)' }}>
                    <p className="font-bold text-rose-300 text-base mb-1">2. Copy Your &ldquo;Secret key&rdquo;</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(245,239,230,0.85)' }}>
                      Under <strong>Standard keys</strong>, click <strong>&ldquo;Reveal live key&rdquo;</strong> next to <strong>Secret key</strong>. Copy the code that starts with <code className="text-amber-300 font-mono">sk_live_...</code>
                    </p>
                  </li>

                  <li className="p-4 rounded-2xl" style={{ background: 'rgba(26,15,36,0.7)', border: '1px solid rgba(232,116,138,0.25)' }}>
                    <p className="font-bold text-rose-300 text-base mb-1">3. Paste &amp; Click &ldquo;Verify &amp; Save&rdquo;</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(245,239,230,0.85)' }}>
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
                  className="rounded-3xl p-6 sm:p-7 shadow-xl"
                  style={{ background: 'rgba(61, 37, 82, 0.6)', border: '2px solid rgba(232,116,138,0.3)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        💳 Credit Card &amp; Stripe Integration
                      </h3>
                      <p className="text-sm mt-1" style={{ color: 'rgba(245,239,230,0.8)' }}>
                        Accept Visa, Mastercard, Amex, and Apple Pay automatically at checkout
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold">
                      <input
                        type="checkbox"
                        checked={enableStripe}
                        onChange={(e) => setEnableStripe(e.target.checked)}
                        className="w-5 h-5 accent-[#e8748a] rounded"
                      />
                      <span>Enable Card Checkout</span>
                    </label>
                  </div>

                  {/* Current Status Banner */}
                  <div
                    className="rounded-2xl p-4 mb-5 flex flex-wrap items-center justify-between gap-4"
                    style={
                      stripeConfigured
                        ? { background: 'rgba(16, 185, 129, 0.15)', border: '2px solid #10b981' }
                        : { background: 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b' }
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{stripeConfigured ? '✅' : '⚡'}</span>
                      <div>
                        <p className="text-base font-bold" style={{ color: stripeConfigured ? '#6ee7b7' : '#fcd34d' }}>
                          {stripeConfigured ? 'Stripe Key Is Saved & Active' : 'No Stripe Key Connected Yet'}
                        </p>
                        <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: 'rgba(245,239,230,0.85)' }}>
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
                      className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer"
                      style={{
                        background: '#e8748a',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(232,116,138,0.35)',
                      }}
                    >
                      {testingStripe ? 'Testing Connection...' : stripeSecretKeyInput ? '✓ Verify & Save Key' : '🔄 Test Saved Key'}
                    </button>
                  </div>

                  {/* Test Result Box */}
                  {stripeTestResult && (
                    <div
                      className="rounded-2xl p-4 mb-5 text-sm"
                      style={
                        stripeTestResult.valid
                          ? { background: 'rgba(16, 185, 129, 0.18)', border: '2px solid #10b981', color: '#a7f3d0' }
                          : { background: 'rgba(239, 68, 68, 0.18)', border: '2px solid #ef4444', color: '#fca5a5' }
                      }
                    >
                      {stripeTestResult.valid ? (
                        <div className="space-y-1">
                          <p className="font-bold text-base text-emerald-300">
                            🎉 Connected Successfully! ({stripeTestResult.mode} MODE)
                          </p>
                          <p>Account: <strong>{stripeTestResult.accountName}</strong></p>
                          <p>Card Charges Enabled: <strong>{stripeTestResult.chargesEnabled ? 'Yes — Ready for live sales!' : 'Pending Stripe account verification'}</strong></p>
                        </div>
                      ) : (
                        <p className="font-bold">❌ {stripeTestResult.error}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-rose-200">
                        Stripe Secret Key (Starts with <code className="text-rose-300 font-mono">sk_live_</code> or <code className="text-amber-300 font-mono">sk_test_</code>)
                      </label>
                      <input
                        type="password"
                        value={stripeSecretKeyInput}
                        onChange={(e) => setStripeSecretKeyInput(e.target.value)}
                        placeholder={stripeConfigured ? `Saved (${stripeSecretKeyMasked}) — Paste new key here to replace` : 'sk_live_51...'}
                        className="w-full px-4 py-3 rounded-xl text-base outline-none font-mono"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-rose-200">
                        Stripe Publishable Key (Optional — Starts with <code className="text-rose-300 font-mono">pk_live_</code>)
                      </label>
                      <input
                        type="text"
                        value={stripePublishableKey}
                        onChange={(e) => setStripePublishableKey(e.target.value)}
                        placeholder="pk_live_51..."
                        className="w-full px-4 py-3 rounded-xl text-base outline-none font-mono"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Shipping Rates Setup */}
                <div
                  className="rounded-3xl p-6 sm:p-7 shadow-xl"
                  style={{ background: 'rgba(61, 37, 82, 0.6)', border: '2px solid rgba(232,116,138,0.3)' }}
                >
                  <h3 className="text-xl font-bold mb-1 text-white">
                    📦 Shipping Rates
                  </h3>
                  <p className="text-sm mb-5 font-medium" style={{ color: 'rgba(245,239,230,0.8)' }}>
                    Set your standard flat shipping fee and the customer cart total that qualifies for free shipping
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-rose-200">
                        Flat Shipping Rate ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={shippingFlatRate}
                        onChange={(e) => setShippingFlatRate(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-base font-bold outline-none"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-rose-200">
                        Free Shipping Over ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={freeShippingThreshold}
                        onChange={(e) => setFreeShippingThreshold(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-base font-bold outline-none"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2.5: Plug & Play Automatic USPS Label Generator (Shippo) */}
                <div
                  className="rounded-3xl p-6 sm:p-7 shadow-xl"
                  style={{ background: 'rgba(61, 37, 82, 0.6)', border: '2px solid rgba(232,116,138,0.3)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        🏷️ Automatic USPS Shipping Labels (Plug &amp; Play)
                      </h3>
                      <p className="text-sm mt-0.5 font-medium" style={{ color: 'rgba(245,239,230,0.8)' }}>
                        Automatically generate 4x6 USPS postage labels the moment a customer orders
                      </p>
                    </div>
                    <a
                      href="https://apps.goshippo.com/settings/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold px-4 py-2 rounded-xl"
                      style={{ background: 'rgba(232,116,138,0.25)', color: '#f5efe6', border: '1px solid rgba(232,116,138,0.45)' }}
                    >
                      Get Free Shippo Token ↗
                    </a>
                  </div>

                  {/* Shippo Status Banner */}
                  <div
                    className="rounded-2xl p-4 mb-5 flex flex-wrap items-center justify-between gap-4"
                    style={
                      shippoConfigured
                        ? { background: 'rgba(16, 185, 129, 0.15)', border: '2px solid #10b981' }
                        : { background: 'rgba(56, 189, 248, 0.15)', border: '2px solid #38bdf8' }
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{shippoConfigured ? '🖨️' : '📬'}</span>
                      <div>
                        <p className="text-base font-bold" style={{ color: shippoConfigured ? '#6ee7b7' : '#38bdf8' }}>
                          {shippoConfigured ? 'Automatic USPS Postage Connected' : 'Packing Slips Ready · Add Shippo for 1-Click USPS Postage'}
                        </p>
                        <p className="text-sm font-medium mt-0.5" style={{ color: 'rgba(245,239,230,0.85)' }}>
                          {shippoConfigured
                            ? `Token: ${shippoKeyMasked} — Labels auto-generate when orders arrive!`
                            : 'Large-print Packing Slips work right now with zero setup! Add a free Shippo token below to buy USPS postage automatically.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestShippo}
                      disabled={testingShippo}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer"
                      style={{
                        background: '#e8748a',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(232,116,138,0.35)',
                      }}
                    >
                      {testingShippo ? 'Testing Shippo...' : shippoKeyInput ? '✓ Verify & Save Token' : '🔄 Test Shippo'}
                    </button>
                  </div>

                  {shippoTestResult && (
                    <div
                      className="rounded-2xl p-4 mb-5 text-sm"
                      style={
                        shippoTestResult.valid
                          ? { background: 'rgba(16, 185, 129, 0.18)', border: '2px solid #10b981', color: '#a7f3d0' }
                          : { background: 'rgba(239, 68, 68, 0.18)', border: '2px solid #ef4444', color: '#fca5a5' }
                      }
                    >
                      {shippoTestResult.valid ? (
                        <p className="font-bold text-base text-emerald-300">
                          🎉 Shippo Connected! ({shippoTestResult.mode} MODE · Carriers: {shippoTestResult.carriers})
                        </p>
                      ) : (
                        <p className="font-bold">❌ {shippoTestResult.error}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-rose-200">
                        Shippo API Token (Starts with <code className="text-rose-300 font-mono">shippo_live_</code> or <code className="text-amber-300 font-mono">shippo_test_</code>)
                      </label>
                      <input
                        type="password"
                        value={shippoKeyInput}
                        onChange={(e) => setShippoKeyInput(e.target.value)}
                        placeholder={shippoConfigured ? `Saved (${shippoKeyMasked}) — Paste new token to replace` : 'shippo_live_...'}
                        className="w-full px-4 py-3 rounded-xl text-base outline-none font-mono"
                        style={inputStyle}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <label className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer text-sm font-bold" style={{ background: 'rgba(26,15,36,0.65)', border: '1px solid rgba(232,116,138,0.25)' }}>
                        <input
                          type="checkbox"
                          checked={autoCreateLabel}
                          onChange={(e) => setAutoCreateLabel(e.target.checked)}
                          className="w-5 h-5 accent-[#e8748a] rounded"
                        />
                        <span>⚡ Auto-create label on backend when customer orders</span>
                      </label>

                      <label className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer text-sm font-bold" style={{ background: 'rgba(26,15,36,0.65)', border: '1px solid rgba(232,116,138,0.25)' }}>
                        <input
                          type="checkbox"
                          checked={autoPrintQueue}
                          onChange={(e) => setAutoPrintQueue(e.target.checked)}
                          className="w-5 h-5 accent-[#e8748a] rounded"
                        />
                        <span>🖨️ Show 1-Click &ldquo;Print All Unprinted Labels&rdquo; banner for Bonnie</span>
                      </label>
                    </div>

                    {/* =========================================================
                        REQUIREMENT R3: RETURN ADDRESS STATUS BADGE
                       ========================================================= */}
                    <div className="pt-5 border-t" style={{ borderColor: 'rgba(232,116,138,0.25)' }}>
                      <p className="text-base font-bold uppercase tracking-wider mb-2 text-rose-300">
                        📍 Bonnie&apos;s Return Address (Printed on Labels &amp; Packing Slips)
                      </p>

                      {/* Visual Status Banner for Return Address Source */}
                      <div
                        className="rounded-2xl p-4 mb-5 flex items-center gap-3.5 text-sm sm:text-base font-bold shadow-md"
                        style={
                          activeAddressSource === 'admin_settings'
                            ? { background: 'rgba(16, 185, 129, 0.2)', border: '2px solid #10b981', color: '#6ee7b7' }
                            : activeAddressSource === 'shippo_address_book'
                            ? { background: 'rgba(56, 189, 248, 0.2)', border: '2px solid #38bdf8', color: '#7dd3fc' }
                            : { background: 'rgba(245, 158, 11, 0.2)', border: '2px solid #f59e0b', color: '#fde68a' }
                        }
                      >
                        <span className="text-2xl">
                          {activeAddressSource === 'admin_settings'
                            ? '🟢'
                            : activeAddressSource === 'shippo_address_book'
                            ? '📬'
                            : '⚠️'}
                        </span>
                        <div>
                          <p>
                            {activeAddressSource === 'admin_settings'
                              ? '🟢 Active: Using Custom Return Address from Admin Settings (100% Private)'
                              : activeAddressSource === 'shippo_address_book'
                              ? '📬 Active: Auto-detected from Shippo Address Book (Fallback Active)'
                              : '⚠️ Notice: Please enter your return address so shipping labels have a sender address.'}
                          </p>
                          <p className="text-xs sm:text-sm font-normal opacity-90 mt-0.5">
                            {activeAddressSource === 'admin_settings'
                              ? 'Your address is stored securely and never displayed on public storefront pages.'
                              : activeAddressSource === 'shippo_address_book'
                              ? 'Shippo will automatically print the sender address saved in your Shippo account.'
                              : 'Enter your address below to ensure packages show your sender information.'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold mb-1 text-rose-200">Sender Name</label>
                          <input
                            type="text"
                            value={returnName}
                            onChange={(e) => setReturnName(e.target.value)}
                            placeholder="Bonnie's Boutique"
                            className="w-full px-4 py-3 rounded-xl text-base outline-none"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-1 text-rose-200">Default Package Weight (oz)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={defaultWeightOz}
                            onChange={(e) => setDefaultWeightOz(e.target.value)}
                            placeholder="4.0"
                            className="w-full px-4 py-3 rounded-xl text-base outline-none"
                            style={inputStyle}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-bold mb-1 text-rose-200">Return Street Address</label>
                          <input
                            type="text"
                            value={returnStreet}
                            onChange={(e) => setReturnStreet(e.target.value)}
                            placeholder="123 Crafty Lane"
                            className="w-full px-4 py-3 rounded-xl text-base outline-none"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-1 text-rose-200">City</label>
                          <input
                            type="text"
                            value={returnCity}
                            onChange={(e) => setReturnCity(e.target.value)}
                            placeholder="Springfield"
                            className="w-full px-4 py-3 rounded-xl text-base outline-none"
                            style={inputStyle}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-bold mb-1 text-rose-200">State</label>
                            <input
                              type="text"
                              value={returnState}
                              onChange={(e) => setReturnState(e.target.value)}
                              placeholder="OH"
                              className="w-full px-4 py-3 rounded-xl text-base outline-none"
                              style={inputStyle}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold mb-1 text-rose-200">ZIP Code</label>
                            <input
                              type="text"
                              value={returnZip}
                              onChange={(e) => setReturnZip(e.target.value)}
                              placeholder="45501"
                              className="w-full px-4 py-3 rounded-xl text-base outline-none"
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
                  className="rounded-3xl p-6 sm:p-7 shadow-xl"
                  style={{ background: 'rgba(61, 37, 82, 0.6)', border: '2px solid rgba(232,116,138,0.3)' }}
                >
                  <h3 className="text-xl font-bold mb-1 text-white">
                    📱 Venmo &amp; PayPal Options
                  </h3>
                  <p className="text-sm mb-5 font-medium" style={{ color: 'rgba(245,239,230,0.8)' }}>
                    Allow customers to also place orders using Venmo or PayPal
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-rose-200">
                          Venmo Handle
                        </label>
                        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableVenmo}
                            onChange={(e) => setEnableVenmo(e.target.checked)}
                            className="w-4 h-4 accent-[#e8748a] rounded"
                          />
                          <span>Enable</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={venmoHandle}
                        onChange={(e) => setVenmoHandle(e.target.value)}
                        placeholder="@BonniesBoutique"
                        className="w-full px-4 py-3 rounded-xl text-base outline-none font-semibold"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-rose-200">
                          PayPal Email / PayPal.Me
                        </label>
                        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enablePaypal}
                            onChange={(e) => setEnablePaypal(e.target.checked)}
                            className="w-4 h-4 accent-[#e8748a] rounded"
                          />
                          <span>Enable</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={paypalEmail}
                        onChange={(e) => setPaypalEmail(e.target.value)}
                        placeholder="bonnie@example.com"
                        className="w-full px-4 py-3 rounded-xl text-base outline-none font-semibold"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 3.5: Gemini AI Vision Configuration */}
                <div
                  className="rounded-3xl p-6 sm:p-7 shadow-xl"
                  style={{ background: 'rgba(61, 37, 82, 0.6)', border: '2px solid rgba(232,116,138,0.3)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>✨</span>
                        <span>Gemini AI Vision Configuration</span>
                      </h3>
                      <p className="text-sm mt-0.5 font-medium" style={{ color: 'rgba(245,239,230,0.8)' }}>
                        Powers 1-click photo background isolation, creative trinket auto-naming, and category classification
                      </p>
                    </div>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold px-4 py-2 rounded-xl transition-all"
                      style={{ background: 'rgba(232,116,138,0.25)', color: '#f5efe6', border: '1px solid rgba(232,116,138,0.45)' }}
                    >
                      Get Free Gemini API Key ↗
                    </a>
                  </div>

                  {/* Status Banner */}
                  <div
                    className="rounded-2xl p-4 mb-5 flex flex-wrap items-center justify-between gap-4"
                    style={
                      geminiConfigured
                        ? { background: 'rgba(16, 185, 129, 0.15)', border: '2px solid #10b981' }
                        : { background: 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b' }
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{geminiConfigured ? '🤖' : '⚡'}</span>
                      <div>
                        <p className="text-base font-bold" style={{ color: geminiConfigured ? '#6ee7b7' : '#fcd34d' }}>
                          {geminiConfigured
                            ? 'Gemini Vision AI Is Active & Ready'
                            : 'No Gemini API Key Configured Yet'}
                        </p>
                        <p className="text-sm font-medium mt-0.5" style={{ color: 'rgba(245,239,230,0.85)' }}>
                          {geminiConfigured
                            ? `Active Key: ${geminiKeyMasked || '••••••••'} (${geminiKeySource === 'env' ? 'Environment Variable' : 'Database'}) · Model: gemini-flash-latest`
                            : 'Paste your Google AI Studio API key below to activate auto-naming & smart descriptions.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveGeminiKey}
                      disabled={savingGemini || !geminiKeyInput.trim()}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-40"
                      style={{
                        background: '#e8748a',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(232,116,138,0.35)',
                      }}
                    >
                      {savingGemini ? 'Saving...' : '✓ Save Gemini Key'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-rose-200">
                        Google Gemini API Key (Starts with <code className="text-rose-300 font-mono">AQ.</code> or <code className="text-amber-300 font-mono">AIza</code>)
                      </label>
                      <input
                        type="password"
                        value={geminiKeyInput}
                        onChange={(e) => setGeminiKeyInput(e.target.value)}
                        placeholder={
                          geminiConfigured
                            ? `Saved (${geminiKeyMasked || '••••••••'}) — Paste new key to replace`
                            : 'Paste your Gemini API key here'
                        }
                        className="w-full px-4 py-3 rounded-xl text-base outline-none font-mono"
                        style={inputStyle}
                      />
                      <p className="text-xs text-rose-200/70 mt-1 font-medium">
                        Key is encrypted &amp; stored securely. Never exposed to public visitors.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Big 52px Save Settings Button */}
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full min-h-[52px] py-4 rounded-2xl text-base sm:text-lg font-extrabold tracking-wide transition-all shadow-xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #e8748a, #c44b63)',
                    color: 'white',
                    boxShadow: '0 8px 25px rgba(232,116,138,0.4)',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  {savingSettings ? 'Saving All Settings...' : '💾 Save All Store & Payment Settings'}
                </button>
              </form>

              {/* Card 4: Admin Password Security */}
              <form
                onSubmit={handleChangePassword}
                className="rounded-3xl p-6 sm:p-7 mt-8 shadow-xl"
                style={{ background: 'rgba(61, 37, 82, 0.6)', border: '2px solid rgba(232,116,138,0.3)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xl font-bold text-white">
                    🔒 Admin Password Security
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs sm:text-sm px-3 py-1 rounded-full font-bold"
                      style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: '1px solid #10b981' }}
                    >
                      Password Protected
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-xs font-bold px-3 py-1 rounded-lg border transition-all cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(232,116,138,0.4)', color: '#f5efe6' }}
                    >
                      <span>{showNewPassword ? '🙈 Hide' : '👁️ Show'}</span>
                    </button>
                  </div>
                </div>
                <p className="text-sm mb-5 font-medium" style={{ color: 'rgba(245,239,230,0.8)' }}>
                  Update the password required to access <code className="text-rose-300 font-mono">/admin</code>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-rose-200">
                      New Admin Password
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Enter new password (min 4 chars)..."
                      className="w-full px-4 py-3 rounded-xl text-base font-bold outline-none"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-rose-200">
                      Confirm New Password
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmNewPasswordInput}
                      onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                      placeholder="Re-enter new password..."
                      className="w-full px-4 py-3 rounded-xl text-base font-bold outline-none"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingPassword || !newPasswordInput.trim()}
                  className="min-h-[48px] px-6 py-3 rounded-xl text-sm sm:text-base font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md"
                  style={{
                    background: 'rgba(232,116,138,0.3)',
                    color: '#f5efe6',
                    border: '2px solid rgba(232,116,138,0.5)',
                  }}
                >
                  {savingPassword ? 'Updating Password...' : '🔑 Update Admin Password'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: MANAGE PRODUCTS (GRANDMA-FRIENDLY OVERHAUL)
           ===================================================================== */}
        {activeTab === 'products' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-8">
              {[
                { label: 'Total Products in Store', value: counts.all, color: '#e8748a' },
                { label: 'Published (Live to Shoppers)', value: counts.published, color: '#6ee7b7' },
                { label: 'Hidden (Saved as Drafts)', value: counts.draft, color: '#fcd34d' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl p-5 sm:p-6 shadow-md"
                  style={{ background: 'rgba(61, 37, 82, 0.6)', border: '2px solid rgba(232,116,138,0.2)' }}
                >
                  <p className="text-3xl sm:text-4xl font-extrabold" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-sm sm:text-base font-semibold mt-1" style={{ color: 'rgba(245,239,230,0.85)' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Grandma-Friendly 1-Click Auto-Magic Trinket Uploader */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <AutoMagicProductUploader
                    onProductPublished={fetchProducts}
                    adminPin={adminPin}
                  />
                </div>
              </div>

              {/* Right Column: Manage Product Catalog List */}
              <div className="lg:col-span-2 space-y-6">
                {/* Search Bar & Status Filters */}
                <div
                  className="rounded-3xl p-5 sm:p-6 shadow-md space-y-4"
                  style={{ background: 'rgba(61, 37, 82, 0.6)', border: '2px solid rgba(232,116,138,0.25)' }}
                >
                  {/* Large Accessible Keyword Search Bar */}
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl" role="img" aria-label="Search">
                      🔍
                    </span>
                    <input
                      type="text"
                      placeholder="Search products by title or description (e.g. Christmas, Puppy, Pen)..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-12 pr-12 py-3.5 rounded-2xl text-base sm:text-lg font-medium outline-none transition-all focus:border-rose-400"
                      style={inputStyle}
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:text-white"
                      >
                        ✕ Clear
                      </button>
                    )}
                  </div>

                  {/* Category Filter Pills with Live Item Counts */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-sm font-extrabold text-rose-300 mr-1 uppercase tracking-wider">
                      Category:
                    </span>
                    {CATEGORIES.map((cat) => {
                      const count = categoryCounts[cat];
                      const isSelected = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                          style={
                            isSelected
                              ? {
                                  background: 'linear-gradient(135deg, #e8748a, #c44b63)',
                                  color: '#ffffff',
                                  boxShadow: '0 4px 15px rgba(232,116,138,0.45)',
                                  border: '2px solid rgba(255,255,255,0.4)',
                                }
                              : {
                                  background: 'rgba(26, 15, 36, 0.7)',
                                  color: 'rgba(245, 239, 230, 0.9)',
                                  border: '1px solid rgba(232, 116, 138, 0.3)',
                                }
                          }
                        >
                          <span>{cat}</span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-extrabold"
                            style={{
                              background: isSelected ? 'rgba(0,0,0,0.35)' : 'rgba(232,116,138,0.25)',
                              color: isSelected ? '#ffffff' : '#f5efe6',
                            }}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Status Pills: All / Published / Draft */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t" style={{ borderColor: 'rgba(232,116,138,0.15)' }}>
                    <span className="text-xs font-bold text-rose-300 mr-1 uppercase tracking-wider">
                      Status:
                    </span>
                    {[
                      { id: 'all', label: 'All Products', count: counts.all },
                      { id: 'published', label: 'Live on Store', count: counts.published },
                      { id: 'draft', label: 'Drafts Only', count: counts.draft },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id as 'all' | 'published' | 'draft')}
                        className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                        style={
                          filter === f.id
                            ? { background: 'rgba(232,116,138,0.35)', color: '#ffffff', border: '1px solid #e8748a' }
                            : { background: 'rgba(26,15,36,0.5)', color: 'rgba(245,239,230,0.7)', border: '1px solid rgba(232,116,138,0.15)' }
                        }
                      >
                        {f.label} ({f.count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {filtered.map((p) => {
                    const currentCategory = getProductCategory(p.title, p.description);
                    const currentPrice = p.price ?? 8.0;
                    const priceInputValue = inlinePrices[p.id] !== undefined ? inlinePrices[p.id] : String(currentPrice);

                    return (
                      <div
                        key={p.id}
                        className="rounded-3xl overflow-hidden flex flex-col justify-between shadow-xl transition-all hover:border-rose-400"
                        style={{ background: 'rgba(61,37,82,0.65)', border: '2px solid rgba(232,116,138,0.25)' }}
                      >
                        <div>
                          {/* Image & Badges */}
                          <div className="relative aspect-square w-full" style={{ background: '#2d1b3d' }}>
                            {p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.imageUrl} alt={p.title} loading="lazy" className="w-full h-full object-contain p-4" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-5xl">✨</div>
                            )}

                            {/* Category Badge */}
                            <span
                              className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full shadow-md"
                              style={{ background: 'rgba(26,15,36,0.85)', color: '#f5efe6', border: '1px solid rgba(232,116,138,0.4)' }}
                            >
                              {currentCategory}
                            </span>

                            {/* Draft / Live Badge */}
                            <span
                              className="absolute top-3 right-3 text-xs font-extrabold px-3 py-1 rounded-full shadow-md"
                              style={
                                p.isDraft
                                  ? { background: '#f59e0b', color: '#1a0f24' }
                                  : { background: '#10b981', color: '#052e16' }
                              }
                            >
                              {p.isDraft ? '🔒 DRAFT' : '🟢 LIVE'}
                            </span>
                          </div>

                          {/* Card Content & Title */}
                          <div className="p-4 sm:p-5 space-y-3">
                            {editingId === p.id ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-bold text-rose-300 uppercase mb-1">Title</label>
                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl text-sm font-bold"
                                    style={inputStyle}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-rose-300 uppercase mb-1">Price ($)</label>
                                  <input
                                    type="number"
                                    step="0.50"
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl text-sm font-bold"
                                    style={inputStyle}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-rose-300 uppercase mb-1">Category</label>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                    {PRODUCT_CATEGORIES.map((cat) => {
                                      const isSelected = editCategory === cat;
                                      return (
                                        <button
                                          key={cat}
                                          type="button"
                                          onClick={() => setEditCategory(cat)}
                                          className={`py-1.5 px-2 rounded-lg text-xs font-extrabold transition-all text-center cursor-pointer ${
                                            isSelected ? 'text-white shadow-md' : 'text-rose-200/70 hover:text-white'
                                          }`}
                                          style={
                                            isSelected
                                              ? { background: 'linear-gradient(135deg, #e8748a, #c44b63)' }
                                              : { background: 'rgba(26, 15, 36, 0.7)', border: '1px solid rgba(232, 116, 138, 0.25)' }
                                          }
                                        >
                                          {cat}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-rose-300 uppercase mb-1">Description</label>
                                  <textarea
                                    value={editDesc}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-xl text-sm"
                                    style={inputStyle}
                                  />
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={() => saveEditProduct(p)}
                                    className="flex-1 py-2 rounded-xl text-sm font-bold cursor-pointer"
                                    style={{ background: '#10b981', color: '#052e16' }}
                                  >
                                    Save Changes
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                                    style={{ background: 'rgba(255,255,255,0.1)', color: '#f5efe6' }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <h3 className="text-base sm:text-lg font-bold text-white line-clamp-2" title={p.title}>
                                  {p.title}
                                </h3>

                                {/* =========================================================
                                    REQUIREMENT R2: 1-CLICK INLINE PRICE EDITING
                                   ========================================================= */}
                                <div className="bg-black/40 border border-rose-300/30 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-rose-300">Price:</span>
                                    <span className="text-base font-extrabold text-white">$</span>
                                    <input
                                      type="number"
                                      step="0.50"
                                      value={priceInputValue}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setInlinePrices((prev) => ({ ...prev, [p.id]: val }));
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleInlinePriceSave(p, (e.target as HTMLInputElement).value);
                                          (e.target as HTMLInputElement).blur();
                                        }
                                      }}
                                      onBlur={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val) && val !== currentPrice) {
                                          handleInlinePriceSave(p, val);
                                        }
                                      }}
                                      className="w-20 px-2 py-1.5 rounded-lg text-base font-extrabold text-white bg-white/10 border border-rose-300/40 text-center outline-none focus:border-emerald-400"
                                    />
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {/* Instant Checkmark Save Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleInlinePriceSave(p, priceInputValue)}
                                      disabled={savingPriceId === p.id}
                                      className="px-3 py-1.5 rounded-lg text-sm font-extrabold transition-all cursor-pointer shadow-sm hover:scale-105"
                                      style={{ background: '#10b981', color: '#052e16' }}
                                      title="Instant Save Price"
                                    >
                                      {savingPriceId === p.id ? '...' : '✓ Save'}
                                    </button>

                                    {/* Quick Increment Buttons for Grandma Ergonomics */}
                                    <button
                                      type="button"
                                      onClick={() => handleInlinePriceSave(p, Math.max(1, currentPrice - 1))}
                                      className="px-2 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-rose-200 cursor-pointer"
                                      title="Decrease $1"
                                    >
                                      -$1
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleInlinePriceSave(p, currentPrice + 1)}
                                      className="px-2 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-emerald-200 cursor-pointer"
                                      title="Increase $1"
                                    >
                                      +$1
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Card Action Buttons: Large 48px Publish/Hide Toggle & Separated Delete */}
                        {editingId !== p.id && (
                          <div className="p-4 sm:p-5 pt-0 space-y-3">
                            {/* REQUIREMENT R2: 1-Click Large 48px Publish/Hide Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleDraft(p)}
                              className="w-full min-h-[48px] h-12 rounded-2xl text-sm sm:text-base font-extrabold flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                              style={
                                p.isDraft
                                  ? {
                                      background: 'rgba(245, 158, 11, 0.22)',
                                      border: '2px solid #f59e0b',
                                      color: '#fcd34d',
                                    }
                                  : {
                                      background: 'rgba(16, 185, 129, 0.22)',
                                      border: '2px solid #10b981',
                                      color: '#6ee7b7',
                                    }
                              }
                            >
                              <span>{p.isDraft ? '🔒 HIDDEN DRAFT — Tap to Publish' : '🟢 LIVE ON STORE — Tap to Hide'}</span>
                            </button>

                            {/* Separated Safe Controls: Full Edit & Safely Separated Delete */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: 'rgba(232,116,138,0.2)' }}>
                              <button
                                type="button"
                                onClick={() => startEditingProduct(p)}
                                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all hover:bg-white/10 cursor-pointer"
                                style={{ color: 'rgba(245,239,230,0.85)', border: '1px solid rgba(245,239,230,0.3)' }}
                              >
                                ✎ Edit Details
                              </button>

                              {/* Explicit Separated Delete Button with Confirmation */}
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(p)}
                                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all hover:bg-red-500/20 cursor-pointer"
                                style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}
                              >
                                🗑️ Delete Product
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filtered.length === 0 && (
                    <div
                      className="col-span-full py-16 px-6 text-center rounded-3xl"
                      style={{ background: 'rgba(61,37,82,0.4)', border: '2px dashed rgba(232,116,138,0.3)' }}
                    >
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="text-lg font-bold text-white">No products found</p>
                      <p className="text-sm mt-1" style={{ color: 'rgba(245,239,230,0.7)' }}>
                        Try clearing your search keyword or switching category pills above.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('');
                          setSelectedCategory('All');
                          setFilter('all');
                        }}
                        className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold bg-rose-500/25 border border-rose-400/50 text-white hover:bg-rose-500/40 cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* =====================================================================
            TAB 3: CUSTOMER ORDERS (EASY PACKING & SHIPPING)
           ===================================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">Customer Orders &amp; Easy Shipping</h2>
                <p className="text-sm font-medium mt-1" style={{ color: 'rgba(245,239,230,0.85)' }}>
                  Every store checkout is listed below. Click &ldquo;Print Packing Slip&rdquo; or &ldquo;Print USPS Postage Label&rdquo; to box &amp; ship!
                </p>
              </div>
              <button
                onClick={fetchOrders}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl text-sm font-bold shadow-md transition-all cursor-pointer hover:scale-[1.02]"
                style={{ background: 'rgba(232,116,138,0.25)', color: '#ffffff', border: '2px solid rgba(232,116,138,0.5)' }}
              >
                🔄 Refresh Orders
              </button>
            </div>

            {ordersLoading ? (
              <div className="py-20 text-center text-base font-bold text-rose-300">
                Loading customer orders...
              </div>
            ) : orders.length === 0 ? (
              <div
                className="rounded-3xl py-20 px-6 text-center shadow-xl"
                style={{ background: 'rgba(61,37,82,0.5)', border: '2px solid rgba(232,116,138,0.25)' }}
              >
                <div className="text-5xl mb-4">📭</div>
                <p className="text-xl font-bold text-white">No orders yet</p>
                <p className="text-sm font-medium mt-1.5" style={{ color: 'rgba(245,239,230,0.75)' }}>
                  When customers place orders on your boutique, they will automatically appear right here!
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {orders.map((order) => {
                  let parsedItems: OrderItem[] = [];
                  try {
                    parsedItems = JSON.parse(order.itemsJson);
                  } catch (_e) {}

                  return (
                    <div
                      key={order.id}
                      className="rounded-3xl p-6 sm:p-7 flex flex-col lg:flex-row justify-between gap-6 shadow-xl transition-all"
                      style={{
                        background: order.labelPrinted
                          ? 'rgba(61,37,82,0.45)'
                          : 'rgba(61,37,82,0.75)',
                        border: order.labelPrinted
                          ? '2px solid rgba(232,116,138,0.2)'
                          : '2px solid #10b981',
                      }}
                    >
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-lg font-extrabold text-white">
                            {order.customerName}
                          </span>
                          <span
                            className="text-xs font-bold px-3 py-1 rounded-full uppercase"
                            style={
                              order.paymentStatus === 'paid' || order.paymentStatus === 'fulfilled'
                                ? { background: 'rgba(16,185,129,0.25)', color: '#6ee7b7', border: '1px solid #10b981' }
                                : { background: 'rgba(245,158,11,0.25)', color: '#fcd34d', border: '1px solid #f59e0b' }
                            }
                          >
                            {order.paymentStatus}
                          </span>
                          <span
                            className="text-xs font-bold px-3 py-1 rounded-full uppercase"
                            style={{ background: 'rgba(232,116,138,0.2)', color: '#f5efe6', border: '1px solid rgba(232,116,138,0.3)' }}
                          >
                            Via {order.paymentMethod}
                          </span>
                          {order.labelUrl && (
                            <span
                              className="text-xs font-extrabold px-3 py-1 rounded-full"
                              style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#6ee7b7', border: '1px solid #10b981' }}
                            >
                              🏷️ USPS Label Auto-Created {order.labelRate ? `($${order.labelRate.toFixed(2)})` : ''}
                            </span>
                          )}
                          {order.labelPrinted && (
                            <span
                              className="text-xs font-bold px-3 py-1 rounded-full"
                              style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff' }}
                            >
                              ✓ Packing Slip Printed
                            </span>
                          )}
                          <span className="text-xs font-medium" style={{ color: 'rgba(245,239,230,0.65)' }}>
                            {new Date(order.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <p className="text-sm font-medium" style={{ color: 'rgba(245,239,230,0.85)' }}>
                          📧 {order.customerEmail} {order.customerPhone ? ` · 📞 ${order.customerPhone}` : ''}
                        </p>
                        <p className="text-base font-semibold text-white">
                          📍 <strong>Ship to:</strong> {order.shippingAddress}
                        </p>

                        {order.trackingNumber && (
                          <p className="text-sm font-bold text-emerald-300">
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
                          <p className="text-sm font-semibold px-3 py-1.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.15)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.3)' }}>
                            ℹ️ {order.labelError}
                          </p>
                        )}

                        <div className="pt-2 flex flex-wrap gap-2">
                          {parsedItems.map((item, idx) => (
                            <span
                              key={idx}
                              className="text-sm px-3.5 py-1.5 rounded-xl font-bold"
                              style={{ background: 'rgba(26,15,36,0.8)', color: '#f5efe6', border: '1px solid rgba(232,116,138,0.25)' }}
                            >
                              {item.quantity}x {item.title} (${item.price.toFixed(2)})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col justify-between items-start lg:items-end gap-4 min-w-[260px]">
                        <div className="text-left lg:text-right">
                          <p className="text-sm font-medium" style={{ color: 'rgba(245,239,230,0.7)' }}>
                            Subtotal: ${order.subtotal.toFixed(2)} · Shipping: ${order.shippingCost.toFixed(2)}
                          </p>
                          <p className="text-2xl font-extrabold text-rose-300 mt-0.5">
                            Total: ${order.total.toFixed(2)}
                          </p>
                        </div>

                        {/* Big Plug & Play Label & Packing Slip Buttons for Bonnie */}
                        <div className="flex flex-wrap gap-2.5 w-full lg:justify-end">
                          <button
                            onClick={() => handlePrintPackingSlip(order)}
                            className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:scale-[1.02]"
                            style={{ background: 'rgba(245,239,230,0.15)', color: '#f5efe6', border: '1px solid rgba(245,239,230,0.4)' }}
                          >
                            🖨️ Print Packing Slip &amp; Address
                          </button>

                          {order.labelUrl ? (
                            <a
                              href={order.labelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleMarkLabelPrinted(order.id, true)}
                              className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md hover:scale-[1.02]"
                              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}
                            >
                              🏷️ Print 4x6 USPS Postage Label ↗
                            </a>
                          ) : (
                            <button
                              onClick={() => handleBuyShippingLabel(order)}
                              disabled={creatingLabelOrderId === order.id}
                              className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
                              style={{ background: 'linear-gradient(135deg, #e8748a, #c44b63)', color: 'white' }}
                            >
                              {creatingLabelOrderId === order.id ? 'Creating USPS Label...' : '🏷️ Buy & Print USPS Label'}
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {order.paymentStatus !== 'paid' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'paid')}
                              className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
                              style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.4)' }}
                            >
                              ✓ Mark Paid
                            </button>
                          )}
                          {order.paymentStatus !== 'fulfilled' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'fulfilled')}
                              className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
                              style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.4)' }}
                            >
                              📦 Mark Shipped
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
                            style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}
                          >
                            ✕ Delete
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
