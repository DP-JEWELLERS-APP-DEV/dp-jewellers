'use client';

import React, { useState, useEffect, useRef } from 'react';
import ProductListView from '@/components/products/ProductListView';
import ProductGridView from '@/components/products/ProductGridView';
import {
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Alert,
  IconButton,
  Chip,
  Box,
  Divider,
  Switch,
  FormControlLabel,
  Checkbox,
  FormGroup,
  CircularProgress,
  Tooltip,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import {
  Add,
  Edit,
  Delete,
  Image as ImageIcon,
  Close,
  ExpandMore,
  ExpandLess,
  Archive,
  RestoreFromTrash,
  Search,
  Star,
  StarBorder,
  LocalFireDepartment,
  FiberNew,
} from '@mui/icons-material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import app from '@/lib/firebase';

const functions = getFunctions(app, 'asia-south1');

const categories = ['Ring', 'Necklace', 'Earring', 'Bangle', 'Bracelet', 'Pendant', 'Chain', 'Anklet', 'Mangalsutra', 'Kada', 'Nosering'];
const materials = ['Gold', 'Silver', 'Platinum'];
const goldPurities = ['14K', '18K', '22K', '24K'];
const silverPurities = ['925_sterling', '999_pure'];
const platinumPurities = ['950'];
const purityLabels = {
  '14K': '14K', '18K': '18K', '22K': '22K', '24K': '24K',
  '925_sterling': '925 Sterling', '999_pure': '999 Pure', '950': '950',
};
const goldOptionsList = [
  { value: 'yellow_gold', label: 'Yellow Gold' },
  { value: 'white_gold', label: 'White Gold' },
  { value: 'rose_gold', label: 'Rose Gold' },
];
const diamondClarities = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'];
const diamondColors = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
const diamondShapes = ['Round', 'Princess', 'Oval', 'Marquise', 'Pear', 'Cushion', 'Emerald', 'Heart', 'Radiant', 'Asscher'];
const settingTypes = ['Pave', 'Prong', 'Bezel', 'Channel', 'Tension', 'Flush', 'Halo', 'Cluster', 'Bar', 'Invisible'];
const sizeCategories = ['Ring', 'Bangle', 'Bracelet', 'Chain', 'Anklet', 'Kada'];
const diamondQualityBuckets = ['SI_IJ', 'SI_GH', 'VS_GH', 'VVS_EF', 'IF_DEF'];
const diamondQualityLabels = { SI_IJ: 'SI-IJ', SI_GH: 'SI-GH', VS_GH: 'VS-GH', VVS_EF: 'VVS-EF', IF_DEF: 'IF-DEF' };
const emptyDiamondVariant = { count: '', shape: '', caratWeight: '', settingType: '', clarity: '', color: '', cut: '' };
const emptyPurityVariant = {
  purity: '', netWeight: '', grossWeight: '',
  availableColors: [], defaultColor: '',
  availableDiamondQualities: [], defaultDiamondQuality: 'SI_IJ',
  sizes: [], defaultSize: '',
};
const emptyMetalEntry = {
  type: 'Gold',
  purityVariants: [{ ...emptyPurityVariant }],
  makingChargeType: 'percentage',
  makingChargeValue: '',
  wastageChargeType: 'percentage',
  wastageChargeValue: '',
  jewelryGst: '',
  makingGst: '',
};
const emptyPurityVariantSize = { size: '', netWeight: '', grossWeight: '' };
const emptyFixedMetal = { type: '', purity: '', netWeight: '', grossWeight: '', sizes: [] };

const getSizeConfig = (category) => {
  switch (category) {
    case 'Ring': return { label: 'Ring Size', placeholder: 'e.g., 13, 14, 15, 16' };
    case 'Chain': return { label: 'Chain Length (inches)', placeholder: 'e.g., 16, 18, 20, 22' };
    case 'Bangle': return { label: 'Bangle Size (inches)', placeholder: 'e.g., 2.4, 2.6, 2.8' };
    case 'Bracelet': return { label: 'Bracelet Length (inches)', placeholder: 'e.g., 7, 7.5, 8' };
    case 'Anklet': return { label: 'Anklet Length (inches)', placeholder: 'e.g., 9, 10, 11' };
    case 'Kada': return { label: 'Kada Size (inches)', placeholder: 'e.g., 2.4, 2.6, 2.8' };
    default: return { label: 'Size', placeholder: 'e.g., 6, 7, 2.4' };
  }
};

const clarityBucketMap = { FL: 'IF', IF: 'IF', VVS1: 'VVS', VVS2: 'VVS', VS1: 'VS', VS2: 'VS', SI1: 'SI', SI2: 'SI', I1: 'SI', I2: 'SI', I3: 'SI' };
const colorBucketMap = { D: 'DEF', E: 'DEF', F: 'DEF', G: 'GH', H: 'GH', I: 'IJ', J: 'IJ', K: 'IJ', L: 'IJ', M: 'IJ' };

const buttonSx = {
  backgroundColor: '#1E1B4B',
  '&:hover': { backgroundColor: '#2D2963' },
  textTransform: 'none',
};

const emptyForm = {
  name: '',
  productCode: '',
  category: '',
  subCategory: '',
  description: '',
  hasDiamond: false,
  diamondVariants: [{ count: '', shape: '', caratWeight: '', settingType: '', clarity: '', color: '', cut: '' }],
  diamondCertification: '',
  stoneSettingCharges: '',
  designCharges: '',
  discount: '',
  huidNumber: '',
  stoneDetails: '',
  status: 'active',
  // Unified metal entries (always configurator format)
  metalEntries: [{ ...emptyMetalEntry }],
  defaultMetalType: 'Gold',
  defaultPurity: '',
  fixedMetals: [],
  featured: false,
  bestseller: false,
  newArrival: true,
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [showDiamond, setShowDiamond] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [metalRates, setMetalRates] = useState(null);
  const [dialogError, setDialogError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const dialogContentRef = useRef(null);

  // Filter states
  const [filterCategory, setFilterCategory] = useState([]);
  const [filterMaterial, setFilterMaterial] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'archived'
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [collapsedMetalEntries, setCollapsedMetalEntries] = useState({});

  // Quick toggle handler for featured/bestseller/newArrival
  const handleQuickToggle = async (productId, field) => {
    const product = products.find((p) => p.productId === productId);
    if (!product) return;
    const newValue = !product[field];
    try {
      const updateProduct = httpsCallable(functions, 'updateProduct');
      await updateProduct({ productId, [field]: newValue });
      setProducts((prev) =>
        prev.map((p) =>
          p.productId === productId ? { ...p, [field]: newValue } : p
        )
      );
    } catch (err) {
      console.error('Toggle failed:', err);
      setError('Failed to update product: ' + (err.message || ''));
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const listProducts = httpsCallable(functions, 'listProducts');
      const result = await listProducts({ limit: 50, includeAll: true });
      setProducts(result.data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const fetchMetalRates = async () => {
    try {
      const getMetalRates = httpsCallable(functions, 'getMetalRates');
      const result = await getMetalRates();
      setMetalRates(result.data);
    } catch (err) {
      console.error('Error fetching metal rates:', err);
    }
  };

  const getPuritiesForMetal = (metalType) => {
    if (metalType === 'Gold') return goldPurities;
    if (metalType === 'Silver') return silverPurities;
    if (metalType === 'Platinum') return platinumPurities;
    return [];
  };

  const handleOpenDialog = (product = null) => {
    setDialogError('');
    setFieldErrors({});
    if (product) {
      setEditingProduct(product.productId);
      const diamond = product.diamond || {};
      const pricing = product.pricing || {};

      const deserializeVariants = (variants) => (variants || []).map((v) => ({
        purity: v.purity || '',
        netWeight: v.netWeight || '',
        grossWeight: v.grossWeight || '',
        availableColors: v.availableColors || [],
        defaultColor: v.defaultColor || '',
        availableDiamondQualities: v.availableDiamondQualities || [],
        defaultDiamondQuality: v.defaultDiamondQuality || 'SI_IJ',
        sizes: (v.sizes || []).map((s) => ({ size: s.size || '', netWeight: s.netWeight || '', grossWeight: s.grossWeight || '' })),
        defaultSize: v.defaultSize || '',
      }));

      const deserializeFixedMetals = (fms) => (fms || []).map((fm) => ({
        type: fm.type ? fm.type.charAt(0).toUpperCase() + fm.type.slice(1) : '',
        purity: fm.purity || '',
        netWeight: fm.netWeight || '',
        grossWeight: fm.grossWeight || '',
        sizes: (fm.sizes || []).map((s) => ({
          size: s.size || '',
          netWeight: s.netWeight || '',
          grossWeight: s.grossWeight || '',
        })),
      }));

      const capitalizeType = (t) => t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Gold';

      const configurator = product.configurator || {};
      let metalEntries = [];
      let defaultMetalType = 'Gold';
      let defaultPurity = '';
      let fixedMetalsData = [];

      if (configurator.configurableMetals?.length > 0) {
        // v3 format (standard after unification)
        metalEntries = configurator.configurableMetals.map((me) => ({
          type: capitalizeType(me.type),
          purityVariants: deserializeVariants(me.variants),
          makingChargeType: me.pricing?.makingChargeType || 'percentage',
          makingChargeValue: me.pricing?.makingChargeValue ?? '',
          wastageChargeType: me.pricing?.wastageChargeType || 'percentage',
          wastageChargeValue: me.pricing?.wastageChargeValue ?? '',
          jewelryGst: me.pricing?.jewelryGst ?? '',
          makingGst: me.pricing?.makingGst ?? '',
        }));
        defaultMetalType = capitalizeType(configurator.defaultMetalType || configurator.configurableMetals[0].type);
        defaultPurity = configurator.defaultPurity || configurator.configurableMetals[0].defaultPurity || '';
        fixedMetalsData = deserializeFixedMetals(configurator.fixedMetals);
      } else if (configurator.configurableMetal) {
        // v2 format fallback
        const cm = configurator.configurableMetal;
        metalEntries = [{
          type: capitalizeType(cm.type),
          purityVariants: deserializeVariants(cm.variants),
          makingChargeType: pricing.makingChargeType || 'percentage',
          makingChargeValue: pricing.makingChargeValue ?? '',
          wastageChargeType: pricing.wastageChargeType || 'percentage',
          wastageChargeValue: pricing.wastageChargeValue ?? '',
          jewelryGst: product.tax?.jewelryGst ?? '',
          makingGst: product.tax?.makingGst ?? '',
        }];
        defaultMetalType = capitalizeType(cm.type);
        defaultPurity = cm.defaultPurity || '';
        fixedMetalsData = deserializeFixedMetals(configurator.fixedMetals);
      } else {
        metalEntries = [{ ...emptyMetalEntry }];
      }

      setFormData({
        name: product.name || '',
        productCode: product.productCode || '',
        category: product.category || '',
        subCategory: product.subCategory || '',
        description: product.description || '',
        hasDiamond: diamond.hasDiamond || false,
        diamondVariants: diamond.variants?.length > 0
          ? diamond.variants.map(v => ({ count: v.count || '', shape: v.shape || '', caratWeight: v.caratWeight || '', settingType: v.settingType || '', clarity: v.clarity || diamond.clarity || '', color: v.color || diamond.color || '', cut: v.cut || diamond.cut || '' }))
          : [{ count: '', shape: '', caratWeight: diamond.totalCaratWeight || '', settingType: '', clarity: diamond.clarity || '', color: diamond.color || '', cut: diamond.cut || '' }],
        diamondCertification: diamond.certification || '',
        stoneSettingCharges: pricing.stoneSettingCharges || '',
        designCharges: pricing.designCharges || '',
        discount: pricing.discount || '',
        huidNumber: product.certifications?.certificateNumber || '',
        stoneDetails: product.gemstones?.length > 0 ? product.gemstones.map(g => `${g.caratWeight || ''} ct ${g.type || ''}`).join(', ') : '',
        status: product.status || (product.isActive !== false ? 'active' : 'inactive'),
        metalEntries,
        defaultMetalType,
        defaultPurity,

        fixedMetals: fixedMetalsData,
        featured: product.featured || false,
        bestseller: product.bestseller || false,
        newArrival: product.newArrival !== undefined ? product.newArrival : true,
      });
      setShowDiamond(diamond.hasDiamond || false);
      setExistingImages(product.images || []);
    } else {
      setEditingProduct(null);
      setFormData({ ...emptyForm });
      setShowDiamond(false);
      setExistingImages([]);
    }
    setImageFiles([]);
    setImagePreviews([]);
    fetchMetalRates();
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const totalImages = existingImages.length + imageFiles.length + files.length;
    if (totalImages > 10) {
      setError(`Maximum 10 images allowed. You can add ${10 - existingImages.length - imageFiles.length} more.`);
      return;
    }
    setImageFiles((prev) => [...prev, ...files]);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...previews]);
  };

  const removeNewImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    const uploadedImages = [];
    for (const file of imageFiles) {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      uploadedImages.push({ url, caption: '', alt: file.name });
    }
    return uploadedImages;
  };

  // --- Metal Entry Handlers ---
  const handleAddMetalEntry = () => {
    const usedTypes = formData.metalEntries.map((e) => e.type);
    const available = materials.filter((m) => !usedTypes.includes(m));
    const nextType = available[0] || 'Gold';
    setFormData((prev) => ({
      ...prev,
      metalEntries: [...prev.metalEntries, { ...emptyMetalEntry, type: nextType }],
    }));
  };

  const handleRemoveMetalEntry = (metalIndex) => {
    setFormData((prev) => {
      const removed = prev.metalEntries[metalIndex];
      const updated = prev.metalEntries.filter((_, i) => i !== metalIndex);
      return {
        ...prev,
        metalEntries: updated,
        defaultMetalType: prev.defaultMetalType === removed?.type
          ? (updated[0]?.type || 'Gold') : prev.defaultMetalType,
        defaultPurity: prev.defaultMetalType === removed?.type
          ? (updated[0]?.purityVariants?.[0]?.purity || '') : prev.defaultPurity,
      };
    });
  };

  const handleMetalEntryTypeChange = (metalIndex, newType) => {
    setFormData((prev) => ({
      ...prev,
      metalEntries: prev.metalEntries.map((entry, i) =>
        i === metalIndex ? { ...entry, type: newType, purityVariants: entry.purityVariants.map((v) => ({ ...v, purity: '', availableColors: [] })) } : entry
      ),
    }));
  };

  const handleMetalEntryPricingChange = (metalIndex, field, value) => {
    setFormData((prev) => ({
      ...prev,
      metalEntries: prev.metalEntries.map((entry, i) =>
        i === metalIndex ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const toggleMetalEntryCollapse = (metalIndex) => {
    setCollapsedMetalEntries((prev) => ({ ...prev, [metalIndex]: !prev[metalIndex] }));
  };

  // --- Purity Variant Handlers (with metalIndex) ---
  const handleAddPurityVariant = (metalIndex) => {
    setFormData((prev) => ({
      ...prev,
      metalEntries: prev.metalEntries.map((entry, i) =>
        i === metalIndex ? { ...entry, purityVariants: [...entry.purityVariants, { ...emptyPurityVariant }] } : entry
      ),
    }));
  };

  const handleRemovePurityVariant = (metalIndex, variantIndex) => {
    setFormData((prev) => ({
      ...prev,
      metalEntries: prev.metalEntries.map((entry, i) => {
        if (i !== metalIndex) return entry;
        return { ...entry, purityVariants: entry.purityVariants.filter((_, vi) => vi !== variantIndex) };
      }),
    }));
  };

  const handlePurityVariantChange = (metalIndex, variantIndex, field, value) => {
    setFormData((prev) => ({
      ...prev,
      metalEntries: prev.metalEntries.map((entry, i) =>
        i === metalIndex ? {
          ...entry,
          purityVariants: entry.purityVariants.map((v, vi) =>
            vi === variantIndex ? { ...v, [field]: value } : v
          ),
        } : entry
      ),
    }));
  };

  const handlePurityVariantColorToggle = (metalIndex, variantIndex, color) => {
    setFormData((prev) => ({
      ...prev,
      metalEntries: prev.metalEntries.map((entry, i) => {
        if (i !== metalIndex) return entry;
        return {
          ...entry,
          purityVariants: entry.purityVariants.map((v, vi) => {
            if (vi !== variantIndex) return v;
            const current = v.availableColors || [];
            const next = current.includes(color) ? current.filter((c) => c !== color) : [...current, color];
            return { ...v, availableColors: next, defaultColor: next.includes(v.defaultColor) ? v.defaultColor : (next[0] || '') };
          }),
        };
      }),
    }));
  };

  const handlePurityVariantDiamondToggle = (metalIndex, variantIndex, quality) => {
    setFormData((prev) => ({
      ...prev,
      metalEntries: prev.metalEntries.map((entry, i) => {
        if (i !== metalIndex) return entry;
        return {
          ...entry,
          purityVariants: entry.purityVariants.map((v, vi) => {
            if (vi !== variantIndex) return v;
            const current = v.availableDiamondQualities || [];
            const next = current.includes(quality) ? current.filter((q) => q !== quality) : [...current, quality];
            return { ...v, availableDiamondQualities: next, defaultDiamondQuality: next.includes(v.defaultDiamondQuality) ? v.defaultDiamondQuality : (next[0] || 'SI_IJ') };
          }),
        };
      }),
    }));
  };

  const handleAddVariantSize = (metalIndex, variantIndex) => {
    setFormData((prev) => ({
      ...prev,
      metalEntries: prev.metalEntries.map((entry, i) =>
        i === metalIndex ? {
          ...entry,
          purityVariants: entry.purityVariants.map((v, vi) =>
            vi === variantIndex ? { ...v, sizes: [...v.sizes, { ...emptyPurityVariantSize }] } : v
          ),
        } : entry
      ),
    }));
  };

  const handleRemoveVariantSize = (metalIndex, variantIndex, sizeIndex) => {
    setFormData((prev) => ({
      ...prev,
      metalEntries: prev.metalEntries.map((entry, i) =>
        i === metalIndex ? {
          ...entry,
          purityVariants: entry.purityVariants.map((v, vi) =>
            vi === variantIndex ? { ...v, sizes: v.sizes.filter((_, si) => si !== sizeIndex) } : v
          ),
        } : entry
      ),
    }));
  };

  const handleVariantSizeChange = (metalIndex, variantIndex, sizeIndex, field, value) => {
    setFormData((prev) => ({
      ...prev,
      metalEntries: prev.metalEntries.map((entry, i) =>
        i === metalIndex ? {
          ...entry,
          purityVariants: entry.purityVariants.map((v, vi) =>
            vi === variantIndex ? { ...v, sizes: v.sizes.map((s, si) => si === sizeIndex ? { ...s, [field]: value } : s) } : v
          ),
        } : entry
      ),
    }));
  };

  // --- Fixed Metal Handlers ---
  const handleAddFixedMetal = () => {
    setFormData((prev) => ({
      ...prev,
      fixedMetals: [...prev.fixedMetals, { ...emptyFixedMetal }],
    }));
  };

  const handleRemoveFixedMetal = (index) => {
    setFormData((prev) => ({
      ...prev,
      fixedMetals: prev.fixedMetals.filter((_, i) => i !== index),
    }));
  };

  const handleFixedMetalChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      fixedMetals: prev.fixedMetals.map((fm, i) =>
        i === index ? { ...fm, [field]: value, ...(field === 'type' ? { purity: '' } : {}) } : fm
      ),
    }));
  };

  const handleFixedMetalSizeChange = (fmIdx, sizeStr, field, value) => {
    setFormData((prev) => ({
      ...prev,
      fixedMetals: prev.fixedMetals.map((fm, i) => {
        if (i !== fmIdx) return fm;
        const has = fm.sizes?.find((s) => String(s.size) === String(sizeStr));
        if (has) return { ...fm, sizes: fm.sizes.map((s) => String(s.size) === String(sizeStr) ? { ...s, [field]: value } : s) };
        return { ...fm, sizes: [...(fm.sizes || []), { size: sizeStr, netWeight: '', grossWeight: '', [field]: value }] };
      }),
    }));
  };

  const getAvailableSizes = () => {
    const seen = new Set();
    for (const entry of formData.metalEntries)
      for (const v of entry.purityVariants || [])
        for (const s of v.sizes || [])
          if (s.size) seen.add(String(s.size).trim());
    return [...seen].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  };

  const handleAddDiamondVariant = () => {
    setFormData((prev) => ({
      ...prev,
      diamondVariants: [...prev.diamondVariants, { ...emptyDiamondVariant }],
    }));
  };

  const handleRemoveDiamondVariant = (index) => {
    setFormData((prev) => ({
      ...prev,
      diamondVariants: prev.diamondVariants.filter((_, i) => i !== index),
    }));
  };

  const handleDiamondVariantChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      diamondVariants: prev.diamondVariants.map((v, i) =>
        i === index ? { ...v, [field]: value } : v
      ),
    }));
  };

  const getDiamondTotals = () => {
    const totalCount = formData.diamondVariants.reduce((sum, v) => sum + (Number(v.count) || 0), 0);
    const totalWeight = formData.diamondVariants.reduce((sum, v) => sum + (Number(v.caratWeight) || 0), 0);
    return { totalCount, totalWeight: Math.round(totalWeight * 1000) / 1000 };
  };

  // Shared diamond calculation helper
  const calculateDiamondPreview = () => {
    let diamondValue = 0;
    const diamondBreakdown = [];
    if (formData.hasDiamond && metalRates?.diamond) {
      for (const variant of formData.diamondVariants) {
        if (!variant.caratWeight) continue;
        const vClarity = clarityBucketMap[variant.clarity] || 'SI';
        const vColor = colorBucketMap[variant.color] || 'IJ';
        const vRateKey = `${vClarity}_${vColor}`;
        const vRate = metalRates.diamond[vRateKey] || metalRates.diamond['SI_IJ'] || 0;
        const variantValue = (Number(variant.caratWeight) || 0) * vRate;
        diamondValue += variantValue;
        if (variant.clarity && variant.color) {
          diamondBreakdown.push({ clarity: variant.clarity, color: variant.color, bucket: `${vClarity}-${vColor}`, rate: vRate, weight: Number(variant.caratWeight) || 0, value: Math.round(variantValue) });
        }
      }
    }
    return { diamondValue, diamondBreakdown };
  };

  // Per-metal price preview (uses default variant of a metal entry + fixed metals)
  const calculateMetalEntryPreview = (metalEntry, selectedSize = null) => {
    if (!metalRates) return null;
    const defaultVariant = metalEntry.purityVariants?.find(v => v.purity && v.netWeight);
    if (!defaultVariant) return null;

    const materialType = metalEntry.type.toLowerCase();
    let ratePerGram = 0;
    if (materialType === 'gold' && defaultVariant.purity && metalRates.gold) ratePerGram = metalRates.gold[defaultVariant.purity] || 0;
    else if (materialType === 'silver' && defaultVariant.purity && metalRates.silver) ratePerGram = metalRates.silver[defaultVariant.purity] || 0;
    else if (materialType === 'platinum' && metalRates.platinum) ratePerGram = metalRates.platinum?.[defaultVariant.purity] || metalRates.platinum?.perGram || 0;

    // Resolve main metal weight: size-specific or base
    const sizeEntryMain = selectedSize && defaultVariant.sizes?.length > 0
      ? defaultVariant.sizes.find(s => String(s.size) === String(selectedSize)) : null;
    const netWeight = Number(sizeEntryMain?.netWeight ?? defaultVariant.netWeight) || 0;
    let metalValue = netWeight * ratePerGram;
    let totalNetWeight = netWeight;
    const metalBreakdown = [{ type: metalEntry.type, purity: defaultVariant.purity, weight: netWeight, rate: ratePerGram, value: Math.round(metalValue) }];

    // Add fixed metals (size-aware)
    for (const fm of formData.fixedMetals) {
      if (!fm.type) continue;
      const fmType = fm.type.toLowerCase();
      let fmRate = 0;
      if (fmType === 'gold' && fm.purity && metalRates.gold) fmRate = metalRates.gold[fm.purity] || 0;
      else if (fmType === 'silver' && fm.purity && metalRates.silver) fmRate = metalRates.silver[fm.purity] || 0;
      else if (fmType === 'platinum' && metalRates.platinum) fmRate = metalRates.platinum?.[fm.purity] || metalRates.platinum?.perGram || 0;
      const sizeRow = selectedSize && fm.sizes?.length > 0 ? fm.sizes.find(s => String(s.size) === String(selectedSize)) : null;
      const fmWeight = Number(sizeRow?.netWeight ?? fm.netWeight) || 0;
      if (!fmWeight) continue;
      const fmValue = fmWeight * fmRate;
      metalValue += fmValue;
      totalNetWeight += fmWeight;
      metalBreakdown.push({ type: fm.type, purity: fm.purity, weight: fmWeight, rate: fmRate, value: Math.round(fmValue), isFixed: true });
    }

    const { diamondValue, diamondBreakdown } = calculateDiamondPreview();

    const mcType = metalEntry.makingChargeType || 'percentage';
    const mcValue = Number(metalEntry.makingChargeValue) || 0;
    let makingChargeAmount = 0;
    if (mcType === 'percentage') makingChargeAmount = metalValue * (mcValue / 100);
    else if (mcType === 'flat_per_gram') makingChargeAmount = totalNetWeight * mcValue;
    else if (mcType === 'fixed_amount') makingChargeAmount = mcValue;

    const wcType = metalEntry.wastageChargeType || 'percentage';
    const wcValue = Number(metalEntry.wastageChargeValue) || 0;
    let wastageChargeAmount = 0;
    if (wcType === 'percentage') wastageChargeAmount = metalValue * (wcValue / 100);
    else wastageChargeAmount = wcValue;

    const stoneSettingCharges = Number(formData.stoneSettingCharges) || 0;
    const designCharges = Number(formData.designCharges) || 0;

    const subtotal = metalValue + diamondValue + makingChargeAmount + wastageChargeAmount + stoneSettingCharges + designCharges;
    const discount = Number(formData.discount) || 0;

    const jewelryTaxRate = Number(metalEntry.jewelryGst) || 3;
    const makingTaxRate = Number(metalEntry.makingGst) || 0;

    const jewelryTaxable = metalValue + diamondValue;
    const labourTaxable = makingChargeAmount + wastageChargeAmount + stoneSettingCharges + designCharges;
    const jewelryTax = jewelryTaxable * (jewelryTaxRate / 100);
    const labourTax = labourTaxable * (makingTaxRate / 100);
    const totalTax = jewelryTax + labourTax;
    const finalPrice = Math.round(subtotal - discount + totalTax);

    return {
      variantLabel: `${metalEntry.type} ${defaultVariant.purity}`,
      metalBreakdown, metalValue: Math.round(metalValue), totalNetWeight,
      diamondValue: Math.round(diamondValue), diamondBreakdown,
      mcType, mcValue, makingChargeAmount: Math.round(makingChargeAmount),
      wcType, wcValue, wastageChargeAmount: Math.round(wastageChargeAmount),
      stoneSettingCharges, designCharges, subtotal: Math.round(subtotal), discount,
      jewelryTaxRate, makingTaxRate, jewelryTax: Math.round(jewelryTax), labourTax: Math.round(labourTax), totalTax: Math.round(totalTax), finalPrice,
    };
  };

  const handleSubmit = async () => {
    setDialogError('');
    setFieldErrors({});

    // Validation
    const errors = {};
    if (!formData.name) errors.name = true;
    if (!formData.productCode) errors.productCode = true;
    if (!formData.category) errors.category = true;

    const hasValidMetal = formData.metalEntries?.some(entry => entry.purityVariants?.some(v => v.purity && v.netWeight));
    if (!hasValidMetal) {
      errors.metalVariants = true;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const errorMsg = !formData.name || !formData.productCode || !formData.category
        ? 'Please fill in all required fields (Name, Product Code, Category)'
        : 'Please fill in at least one metal with Type, Purity, and Net Weight';
      setDialogError(errorMsg);
      // Scroll to top of dialog
      if (dialogContentRef.current) {
        dialogContentRef.current.scrollTop = 0;
      }
      return;
    }

    setSaving(true);
    setDialogError('');
    setSuccess('');

    try {
      let allImages = [...existingImages];

      if (imageFiles.length > 0) {
        const newImages = await uploadImages();
        allImages = [...allImages, ...newImages];
      }

      const diamond = {
        hasDiamond: formData.hasDiamond,
      };
      if (formData.hasDiamond) {
        const variants = formData.diamondVariants
          .filter(v => v.count || v.caratWeight)
          .map(v => ({
            count: Number(v.count) || 0,
            shape: v.shape || '',
            caratWeight: Number(v.caratWeight) || 0,
            settingType: v.settingType || '',
            clarity: v.clarity || '',
            color: v.color || '',
            cut: v.cut || '',
          }));
        diamond.variants = variants;
        diamond.totalCaratWeight = variants.reduce((sum, v) => sum + v.caratWeight, 0);
        diamond.totalCount = variants.reduce((sum, v) => sum + v.count, 0);
        diamond.certification = formData.diamondCertification;
      }

      const productData = {
        name: formData.name,
        productCode: formData.productCode,
        category: formData.category,
        subCategory: formData.subCategory,
        description: formData.description,
        images: allImages,
        diamond,
        pricing: {
          stoneSettingCharges: Number(formData.stoneSettingCharges) || 0,
          designCharges: Number(formData.designCharges) || 0,
          discount: Number(formData.discount) || 0,
        },
        certifications: formData.huidNumber ? {
          hasCertificate: true,
          certificateNumber: formData.huidNumber,
        } : {},
        status: formData.status,
        featured: formData.featured,
        bestseller: formData.bestseller,
        newArrival: formData.newArrival,
      };

      // Serialize configurator (always enabled)
      const serializeVariants = (variants) => variants
        .filter((v) => v.purity)
        .map((v) => ({
          purity: v.purity,
          netWeight: Number(v.netWeight) || 0,
          grossWeight: Number(v.grossWeight) || 0,
          availableColors: v.availableColors || [],
          defaultColor: v.defaultColor || (v.availableColors || [])[0] || '',
          availableDiamondQualities: v.availableDiamondQualities || [],
          defaultDiamondQuality: v.defaultDiamondQuality || 'SI_IJ',
          sizes: (v.sizes || [])
            .filter((s) => s.size)
            .map((s) => ({
              size: String(s.size).trim(),
              netWeight: Number(s.netWeight) || 0,
              grossWeight: Number(s.grossWeight) || 0,
            })),
          defaultSize: v.defaultSize || '',
        }));

      const configurableMetals = formData.metalEntries
        .filter((entry) => entry.purityVariants?.some((v) => v.purity))
        .map((entry) => ({
          type: entry.type.toLowerCase(),
          defaultPurity: entry.purityVariants.find((v) => v.purity)?.purity || '',
          variants: serializeVariants(entry.purityVariants),
          pricing: {
            makingChargeType: entry.makingChargeType || 'percentage',
            makingChargeValue: Number(entry.makingChargeValue) || 0,
            wastageChargeType: entry.wastageChargeType || 'percentage',
            wastageChargeValue: Number(entry.wastageChargeValue) || 0,
            jewelryGst: Number(entry.jewelryGst) || 0,
            makingGst: Number(entry.makingGst) || 0,
          },
        }));

      productData.configurator = {
        enabled: true,
        configurableMetals,
        defaultMetalType: formData.defaultMetalType.toLowerCase(),
        defaultPurity: formData.defaultPurity,
        fixedMetals: (formData.fixedMetals || [])
          .filter((fm) => fm.type)
          .map((fm) => ({
            type: fm.type.toLowerCase(),
            purity: fm.purity || '',
            netWeight: Number(fm.netWeight) || 0,
            grossWeight: Number(fm.grossWeight) || 0,
            sizes: (fm.sizes || [])
              .filter((s) => s.size)
              .map((s) => ({
                size: s.size,
                netWeight: Number(s.netWeight) || 0,
                grossWeight: Number(s.grossWeight) || 0,
              })),
          })),
      };

      if (editingProduct) {
        const updateProduct = httpsCallable(functions, 'updateProduct');
        const result = await updateProduct({ productId: editingProduct, ...productData });
        if (result.data.pendingApproval) {
          setSuccess('Changes submitted for super admin approval. The live product is unchanged.');
        } else {
          setSuccess('Product updated successfully!');
        }
      } else {
        const createProduct = httpsCallable(functions, 'createProduct');
        const result = await createProduct(productData);
        if (result.data.pendingApproval) {
          setSuccess('Product created and submitted for approval. It will be visible to customers once approved.');
        } else {
          setSuccess('Product created successfully!');
        }
      }

      handleCloseDialog();
      fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Failed to save product: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const deleteProduct = httpsCallable(functions, 'deleteProduct');
      await deleteProduct({ productId });
      setSuccess('Product deleted successfully!');
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete product: ' + (err.message || ''));
    }
  };

  const handleArchive = async (productId) => {
    if (!confirm('Are you sure you want to archive this product?')) return;
    try {
      const deleteProduct = httpsCallable(functions, 'deleteProduct');
      const result = await deleteProduct({ productId });
      if (result.data.pendingApproval) {
        setSuccess('Archive request submitted for approval.');
      } else {
        setSuccess('Product archived successfully!');
      }
      fetchProducts();
    } catch (err) {
      console.error('Error archiving product:', err);
      setError('Failed to archive product: ' + (err.message || ''));
    }
  };

  const handleRestore = async (productId) => {
    try {
      const restoreProduct = httpsCallable(functions, 'restoreProduct');
      const result = await restoreProduct({ productId });
      if (result.data.pendingApproval) {
        setSuccess('Restore request submitted for approval.');
      } else {
        setSuccess('Product restored successfully!');
      }
      fetchProducts();
    } catch (err) {
      console.error('Error restoring product:', err);
      setError('Failed to restore product: ' + (err.message || ''));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'out_of_stock': return 'warning';
      case 'coming_soon': return 'info';
      case 'archived': return 'error';
      case 'pending_approval': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'out_of_stock': return 'Out of Stock';
      case 'coming_soon': return 'Coming Soon';
      case 'archived': return 'Archived';
      case 'pending_approval': return 'Pending Approval';
      default: return status || 'Unknown';
    }
  };

  const getProductStatus = (product) => {
    return product.status || (product.isActive !== false ? 'active' : 'inactive');
  };

  const showSizeField = sizeCategories.some(
    (c) => c.toLowerCase() === formData.category.toLowerCase()
  );

  // Filtered products
  const filteredProducts = products.filter((p) => {
    // Status filter
    if (filterStatus !== 'all') {
      const st = getProductStatus(p);
      if (filterStatus === 'active' && st !== 'active') return false;
      if (filterStatus === 'archived' && st !== 'archived') return false;
    }
    if (filterCategory.length > 0 && !filterCategory.includes(p.category)) return false;
    const productMaterial = (p.configurator?.defaultMetalType || '').charAt(0).toUpperCase() + (p.configurator?.defaultMetalType || '').slice(1);
    if (filterMaterial.length > 0 && !filterMaterial.includes(productMaterial)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (p.name || '').toLowerCase().includes(q);
      const codeMatch = (p.productCode || '').toLowerCase().includes(q);
      if (!nameMatch && !codeMatch) return false;
    }
    if (filterVisibility === 'featured' && !p.featured) return false;
    if (filterVisibility === 'bestseller' && !p.bestseller) return false;
    if (filterVisibility === 'newArrival' && !p.newArrival) return false;
    return true;
  });

  const statusCounts = {
    all: products.length,
    active: products.filter(p => getProductStatus(p) === 'active').length,
    archived: products.filter(p => getProductStatus(p) === 'archived').length,
  };

  const visibilityCounts = {
    featured: products.filter((p) => p.featured).length,
    bestseller: products.filter((p) => p.bestseller).length,
    newArrival: products.filter((p) => p.newArrival).length,
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', padding: '0 0 40px' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1E1B4B', letterSpacing: -0.3 }}>Products</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>
            {filteredProducts.length} of {products.length} products
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: 7, overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: 13,
                background: viewMode === 'list' ? '#1E1B4B' : '#fff',
                color: viewMode === 'list' ? '#fff' : '#555',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >☰ List</button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: 13,
                background: viewMode === 'grid' ? '#1E1B4B' : '#fff',
                color: viewMode === 'grid' ? '#fff' : '#555',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >⊞ Grid</button>
          </div>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={buttonSx}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10,
        padding: '12px 16px', marginBottom: 12,
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Autocomplete multiple size="small" options={categories} value={filterCategory}
          onChange={(_, val) => setFilterCategory(val)}
          renderInput={(params) => <TextField {...params} label="Category" placeholder="All" />}
          sx={{ minWidth: 180 }}
        />
        <Autocomplete multiple size="small" options={materials} value={filterMaterial}
          onChange={(_, val) => setFilterMaterial(val)}
          renderInput={(params) => <TextField {...params} label="Material" placeholder="All" />}
          sx={{ minWidth: 160 }}
        />
        <TextField
          size="small" placeholder="Search name or SKU…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          sx={{ minWidth: 220 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: '#bbb' }} /></InputAdornment>,
          }}
        />
        <Button variant="contained" onClick={handleSearch} sx={{ ...buttonSx, minWidth: 'auto', px: 3 }}>Search</Button>
        {(searchQuery || filterCategory.length > 0 || filterMaterial.length > 0) && (
          <Button variant="text" onClick={() => { setSearchInput(''); setSearchQuery(''); setFilterCategory([]); setFilterMaterial([]); }}
            sx={{ textTransform: 'none', color: '#888', fontSize: 12 }}
          >Clear all</Button>
        )}
      </div>

      {/* ── Status + Visibility tabs ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 2, background: '#fff', border: '1px solid #EBEBEB', borderRadius: 8, padding: 3 }}>
          {[['all', `All (${statusCounts.all})`], ['active', `Active (${statusCounts.active})`], ['archived', `Archived (${statusCounts.archived})`]].map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              style={{
                padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: filterStatus === val ? '#1E1B4B' : 'transparent',
                color: filterStatus === val ? '#fff' : '#666',
                transition: 'all 0.15s',
              }}
            >{label}</button>
          ))}
        </div>

        {/* Visibility chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { val: 'all',        label: 'All',            icon: null,              color: '#1E1B4B' },
            { val: 'featured',   label: `⭐ Signature (${visibilityCounts.featured})`,  color: '#B8860B' },
            { val: 'bestseller', label: `🔥 Bestsellers (${visibilityCounts.bestseller})`, color: '#d32f2f' },
            { val: 'newArrival', label: `🆕 New (${visibilityCounts.newArrival})`,        color: '#1565c0' },
          ].map(({ val, label, color }) => (
            <button key={val} onClick={() => setFilterVisibility(filterVisibility === val && val !== 'all' ? 'all' : val)}
              style={{
                padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${filterVisibility === val ? color : '#E5E7EB'}`,
                background: filterVisibility === val ? color : '#fff',
                color: filterVisibility === val ? '#fff' : '#555',
                transition: 'all 0.15s',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* ── Listing ── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#1E1B4B' }} />
        </Box>
      ) : (
        <div style={{
          background: '#fff',
          border: '1px solid #EBEBEB',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {viewMode === 'list' ? (
            <ProductListView
              products={filteredProducts}
              getProductStatus={getProductStatus}
              onEdit={handleOpenDialog}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onRestore={handleRestore}
              onQuickToggle={handleQuickToggle}
            />
          ) : (
            <ProductGridView
              products={filteredProducts}
              getProductStatus={getProductStatus}
              onEdit={handleOpenDialog}
              onArchive={handleArchive}
              onRestore={handleRestore}
              onQuickToggle={handleQuickToggle}
            />
          )}
        </div>
      )}

      {/* Add/Edit Product Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth
        PaperProps={{ sx: { maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ color: '#1E1B4B', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingProduct ? 'Edit Product' : 'Add New Product'}
          <IconButton onClick={handleCloseDialog} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers ref={dialogContentRef}>
          {/* Validation Error Alert */}
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError('')}>
              {dialogError}
            </Alert>
          )}

          {/* Section 1: Basic Info */}
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1E1B4B', mb: 2 }}>
            Basic Information
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Product Name" required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Product Code / SKU" required
                value={formData.productCode}
                onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                disabled={!!editingProduct}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" select label="Category" required
                value={formData.category}
                onChange={async (e) => {
                  const category = e.target.value;
                  setFormData((prev) => ({ ...prev, category }));
                  if (!editingProduct && category) {
                    try {
                      const generateProductCode = httpsCallable(functions, 'generateProductCode');
                      const result = await generateProductCode({ category });
                      setFormData((prev) => ({ ...prev, productCode: result.data.productCode }));
                    } catch (err) {
                      console.error('Error generating product code:', err);
                    }
                  }
                }}
                sx={{ minWidth: 180 }}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Sub-Category"
                value={formData.subCategory}
                onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Description" multiline rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          {/* Section 2: Metal & Pricing */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1E1B4B' }}>
              Metal & Pricing
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            {/* Default Metal Type & Default Purity — only when multiple metal entries */}
            {formData.metalEntries.length > 1 && (
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={4}>
                  <TextField select fullWidth size="small" label="Default Metal Type"
                    value={formData.defaultMetalType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultMetalType: e.target.value }))}
                    sx={{ minWidth: 160 }}
                  >
                    {formData.metalEntries.filter((e) => e.purityVariants?.some((v) => v.purity)).map((e) => (
                      <MenuItem key={`dmt-${e.type}`} value={e.type}>{e.type}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField select fullWidth size="small" label="Default Purity"
                    value={formData.defaultPurity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultPurity: e.target.value }))}
                    sx={{ minWidth: 140 }}
                  >
                    {(formData.metalEntries.find((e) => e.type === formData.defaultMetalType)?.purityVariants || []).filter((v) => v.purity).map((v) => (
                      <MenuItem key={`cfg-dp-${v.purity}`} value={v.purity}>{v.purity}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            )}

            {fieldErrors.metalVariants && (
              <Chip label="At least one metal type with a purity variant and weight is required" color="error" size="small" sx={{ mb: 2 }} />
            )}

            {/* Metal Type Blocks */}
            {formData.metalEntries.map((metalEntry, mIdx) => {
              const usedTypes = formData.metalEntries.map((e) => e.type);
              const availableTypes = materials.filter((m) => m === metalEntry.type || !usedTypes.includes(m));
              const isGold = metalEntry.type === 'Gold';
              const isCollapsed = collapsedMetalEntries[mIdx];
              const metalPreview = calculateMetalEntryPreview(metalEntry);
              const isSingleEntry = formData.metalEntries.length === 1;

              return (
                <Box key={`me-${mIdx}`} sx={{ mb: 2, backgroundColor: '#f0f0f7', borderRadius: 2, border: '1px solid #c0c0d0' }}>
                  {/* Header — collapsible when multiple entries, flat when single */}
                  {isSingleEntry ? (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#1E1B4B' }}>
                          {metalEntry.type}
                        </Typography>
                        <Chip size="small" label={`${metalEntry.purityVariants.filter((v) => v.purity).length} variant(s)`} sx={{ backgroundColor: '#1E1B4B', color: '#fff', fontSize: 11 }} />
                        {metalPreview && (
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            Est. ₹{metalPreview.finalPrice.toLocaleString('en-IN')}
                          </Typography>
                        )}
                      </Box>
                      <TextField select size="small" label="Metal Type"
                        value={metalEntry.type}
                        onChange={(e) => handleMetalEntryTypeChange(mIdx, e.target.value)}
                        sx={{ minWidth: 120 }}
                      >
                        {availableTypes.map((m) => <MenuItem key={`me-${mIdx}-${m}`} value={m}>{m}</MenuItem>)}
                      </TextField>
                    </Box>
                  ) : (
                    <Box
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, cursor: 'pointer', '&:hover': { backgroundColor: '#e8e8f0' }, borderRadius: isCollapsed ? 2 : '8px 8px 0 0' }}
                      onClick={() => toggleMetalEntryCollapse(mIdx)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {isCollapsed ? <ExpandMore sx={{ color: '#1E1B4B' }} /> : <ExpandLess sx={{ color: '#1E1B4B' }} />}
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#1E1B4B' }}>
                          {metalEntry.type}
                        </Typography>
                        <Chip size="small" label={`${metalEntry.purityVariants.filter((v) => v.purity).length} variant(s)`} sx={{ backgroundColor: '#1E1B4B', color: '#fff', fontSize: 11 }} />
                        {metalPreview && (
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            Est. ₹{metalPreview.finalPrice.toLocaleString('en-IN')}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} onClick={(e) => e.stopPropagation()}>
                        <TextField select size="small" label="Metal Type"
                          value={metalEntry.type}
                          onChange={(e) => handleMetalEntryTypeChange(mIdx, e.target.value)}
                          sx={{ minWidth: 120 }}
                        >
                          {availableTypes.map((m) => <MenuItem key={`me-${mIdx}-${m}`} value={m}>{m}</MenuItem>)}
                        </TextField>
                        <IconButton size="small" onClick={() => handleRemoveMetalEntry(mIdx)} sx={{ color: '#d32f2f' }}>
                          <Close sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  )}

                  {/* Body — always shown for single entry, collapsible for multiple */}
                  {(isSingleEntry || !isCollapsed) && (
                    <Box sx={{ p: 2, pt: 0 }}>
                      {/* Purity Variants within this metal */}
                      {metalEntry.purityVariants.map((variant, vIdx) => (
                        <Box key={`me-${mIdx}-pv-${vIdx}`} sx={{ mb: 2, p: 2, backgroundColor: '#f9f9f9', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1E1B4B' }}>
                              {variant.purity || `Variant ${vIdx + 1}`}
                            </Typography>
                            {metalEntry.purityVariants.length > 1 && (
                              <IconButton size="small" onClick={() => handleRemovePurityVariant(mIdx, vIdx)} sx={{ color: '#d32f2f' }}>
                                <Close sx={{ fontSize: 16 }} />
                              </IconButton>
                            )}
                          </Box>

                          {/* Purity & Base Weights */}
                          <Grid container spacing={2} sx={{ mb: 1.5 }}>
                            <Grid item xs={4} sm={3}>
                              <TextField select fullWidth size="small" label="Purity"
                                value={variant.purity}
                                onChange={(e) => handlePurityVariantChange(mIdx, vIdx, 'purity', e.target.value)}
                                sx={{ minWidth: 100 }}
                              >
                                {getPuritiesForMetal(metalEntry.type).map((p) => (
                                  <MenuItem key={`me-${mIdx}-pv-${vIdx}-${p}`} value={p}>{p}</MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={4} sm={3}>
                              <TextField fullWidth size="small" label="Net Weight (g)" type="number"
                                value={variant.netWeight}
                                onChange={(e) => handlePurityVariantChange(mIdx, vIdx, 'netWeight', e.target.value)}
                              />
                            </Grid>
                            <Grid item xs={4} sm={3}>
                              <TextField fullWidth size="small" label="Gross Weight (g)" type="number"
                                value={variant.grossWeight}
                                onChange={(e) => handlePurityVariantChange(mIdx, vIdx, 'grossWeight', e.target.value)}
                              />
                            </Grid>
                          </Grid>

                          {/* Colors (only for Gold) */}
                          {isGold && (
                            <>
                              <Typography variant="caption" sx={{ color: '#666' }}>Gold Colors</Typography>
                              <FormGroup row sx={{ mb: 1 }}>
                                {goldOptionsList.map((opt) => (
                                  <FormControlLabel key={`me-${mIdx}-pv-${vIdx}-color-${opt.value}`}
                                    control={<Checkbox size="small"
                                      checked={(variant.availableColors || []).includes(opt.value)}
                                      onChange={() => handlePurityVariantColorToggle(mIdx, vIdx, opt.value)}
                                      sx={{ color: '#1E1B4B', '&.Mui-checked': { color: '#1E1B4B' } }}
                                    />}
                                    label={opt.label}
                                  />
                                ))}
                                {(variant.availableColors || []).length > 1 && (
                                  <TextField select size="small" label="Default Color" sx={{ ml: 2, minWidth: 170 }}
                                    value={variant.defaultColor || ''}
                                    onChange={(e) => handlePurityVariantChange(mIdx, vIdx, 'defaultColor', e.target.value)}
                                  >
                                    {(variant.availableColors || []).map((c) => (
                                      <MenuItem key={`me-${mIdx}-pv-${vIdx}-dc-${c}`} value={c}>
                                        {goldOptionsList.find((o) => o.value === c)?.label || c}
                                      </MenuItem>
                                    ))}
                                  </TextField>
                                )}
                              </FormGroup>
                            </>
                          )}

                          {/* Diamond Qualities (only if product has diamonds) */}
                          {formData.hasDiamond && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ color: '#666' }}>Diamond Qualities</Typography>
                              <FormGroup row>
                                {diamondQualityBuckets.map((q) => (
                                  <FormControlLabel key={`me-${mIdx}-pv-${vIdx}-dq-${q}`}
                                    control={<Checkbox size="small"
                                      checked={(variant.availableDiamondQualities || []).includes(q)}
                                      onChange={() => handlePurityVariantDiamondToggle(mIdx, vIdx, q)}
                                      sx={{ color: '#1E1B4B', '&.Mui-checked': { color: '#1E1B4B' } }}
                                    />}
                                    label={diamondQualityLabels[q] || q}
                                  />
                                ))}
                              </FormGroup>
                              {(variant.availableDiamondQualities || []).length > 1 && (
                                <TextField select size="small" label="Default Diamond Quality" sx={{ minWidth: 210 }}
                                  value={variant.defaultDiamondQuality || 'SI_IJ'}
                                  onChange={(e) => handlePurityVariantChange(mIdx, vIdx, 'defaultDiamondQuality', e.target.value)}
                                >
                                  {(variant.availableDiamondQualities || []).map((q) => (
                                    <MenuItem key={`me-${mIdx}-pv-${vIdx}-ddq-${q}`} value={q}>{diamondQualityLabels[q] || q}</MenuItem>
                                  ))}
                                </TextField>
                              )}
                            </Box>
                          )}

                          {/* Sizes with per-size weights */}
                          <Typography variant="caption" sx={{ color: '#666', mt: 1, display: 'block' }}>Sizes & Weights</Typography>
                          {(variant.sizes || []).length > 0 && (
                            <Grid container spacing={1} sx={{ mb: 0.5 }}>
                              <Grid item xs={3}><Typography variant="caption" sx={{ color: '#999' }}>Size</Typography></Grid>
                              <Grid item xs={3}><Typography variant="caption" sx={{ color: '#999' }}>Net Wt (g)</Typography></Grid>
                              <Grid item xs={3}><Typography variant="caption" sx={{ color: '#999' }}>Gross Wt (g)</Typography></Grid>
                              <Grid item xs={3} />
                            </Grid>
                          )}
                          {(variant.sizes || []).map((sz, sIdx) => (
                            <Grid container spacing={1} key={`me-${mIdx}-pv-${vIdx}-sz-${sIdx}`} sx={{ mb: 0.5 }}>
                              <Grid item xs={3}>
                                <TextField size="small" fullWidth value={sz.size} placeholder="e.g., 14"
                                  onChange={(e) => handleVariantSizeChange(mIdx, vIdx, sIdx, 'size', e.target.value)}
                                />
                              </Grid>
                              <Grid item xs={3}>
                                <TextField size="small" fullWidth type="number" value={sz.netWeight} placeholder="2.5"
                                  onChange={(e) => handleVariantSizeChange(mIdx, vIdx, sIdx, 'netWeight', e.target.value)}
                                />
                              </Grid>
                              <Grid item xs={3}>
                                <TextField size="small" fullWidth type="number" value={sz.grossWeight} placeholder="2.8"
                                  onChange={(e) => handleVariantSizeChange(mIdx, vIdx, sIdx, 'grossWeight', e.target.value)}
                                />
                              </Grid>
                              <Grid item xs={3}>
                                <IconButton size="small" onClick={() => handleRemoveVariantSize(mIdx, vIdx, sIdx)} sx={{ color: '#d32f2f' }}>
                                  <Close sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Grid>
                            </Grid>
                          ))}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                            <Button size="small" startIcon={<Add />} onClick={() => handleAddVariantSize(mIdx, vIdx)}
                              sx={{ textTransform: 'none', color: '#1E1B4B' }}
                            >
                              Add Size
                            </Button>
                            {(variant.sizes || []).filter((s) => s.size).length > 0 && (
                              <TextField select size="small" label="Default Size" sx={{ minWidth: 150 }}
                                value={variant.defaultSize || ''}
                                onChange={(e) => handlePurityVariantChange(mIdx, vIdx, 'defaultSize', e.target.value)}
                              >
                                {(variant.sizes || []).filter((s) => s.size).map((s) => (
                                  <MenuItem key={`me-${mIdx}-pv-${vIdx}-ds-${s.size}`} value={s.size}>{s.size}</MenuItem>
                                ))}
                              </TextField>
                            )}
                          </Box>
                        </Box>
                      ))}

                      <Button size="small" startIcon={<Add />} onClick={() => handleAddPurityVariant(mIdx)}
                        sx={{ textTransform: 'none', color: '#1E1B4B', mb: 2 }}
                      >
                        Add Purity Variant
                      </Button>

                      {/* Per-Metal Pricing & Charges */}
                      <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1E1B4B', mb: 1 }}>
                        Charges & Tax for {metalEntry.type}
                      </Typography>
                      <Grid container spacing={2} sx={{ mb: 1 }}>
                        <Grid item xs={6} sm={3}>
                          <TextField fullWidth size="small" select label="Making Charge Type"
                            value={metalEntry.makingChargeType || 'percentage'}
                            onChange={(e) => handleMetalEntryPricingChange(mIdx, 'makingChargeType', e.target.value)}
                          >
                            <MenuItem value="percentage">Percentage (%)</MenuItem>
                            <MenuItem value="flat_per_gram">Per Gram (₹)</MenuItem>
                            <MenuItem value="fixed_amount">Fixed Amount (₹)</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <TextField fullWidth size="small" type="number"
                            label={metalEntry.makingChargeType === 'percentage' ? 'Making (%)' : 'Making (₹)'}
                            value={metalEntry.makingChargeValue}
                            onChange={(e) => handleMetalEntryPricingChange(mIdx, 'makingChargeValue', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField fullWidth size="small" select label="Wastage Charge Type"
                            value={metalEntry.wastageChargeType || 'percentage'}
                            onChange={(e) => handleMetalEntryPricingChange(mIdx, 'wastageChargeType', e.target.value)}
                          >
                            <MenuItem value="percentage">Percentage (%)</MenuItem>
                            <MenuItem value="fixed">Fixed Amount (₹)</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <TextField fullWidth size="small" type="number"
                            label={metalEntry.wastageChargeType === 'percentage' ? 'Wastage (%)' : 'Wastage (₹)'}
                            value={metalEntry.wastageChargeValue}
                            onChange={(e) => handleMetalEntryPricingChange(mIdx, 'wastageChargeValue', e.target.value)}
                          />
                        </Grid>
                      </Grid>
                      <Grid container spacing={2} sx={{ mb: 1 }}>
                        <Grid item xs={6} sm={3}>
                          <TextField fullWidth size="small" type="number" label="GST on Jewelry (%)"
                            value={metalEntry.jewelryGst}
                            onChange={(e) => handleMetalEntryPricingChange(mIdx, 'jewelryGst', e.target.value)}
                            placeholder="Default: 3%"
                          />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField fullWidth size="small" type="number" label="GST on Making (%)"
                            value={metalEntry.makingGst}
                            onChange={(e) => handleMetalEntryPricingChange(mIdx, 'makingGst', e.target.value)}
                            placeholder="Default: 0%"
                          />
                        </Grid>
                      </Grid>

                      {/* Per-Metal Price Preview */}
                      {metalPreview && (
                        <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: '#F5F5F5', borderRadius: 1.5, border: '1px solid #E0E0E0' }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#1E1B4B', display: 'block', mb: 0.5 }}>
                            Price Preview ({metalPreview.variantLabel})
                          </Typography>
                          <Grid container spacing={0.5} sx={{ display: 'flex', flexDirection: 'column' }}>
                            {metalPreview.metalBreakdown.map((m, i) => (
                              <React.Fragment key={i}>
                                <Grid item xs={8}>
                                  <Typography variant="caption" sx={{ color: '#666' }}>
                                    {m.type} ({m.purity?.replace('_', ' ')}): {m.weight}g × ₹{m.rate.toLocaleString('en-IN')}/g
                                  </Typography>
                                </Grid>
                                <Grid item xs={4} sx={{ textAlign: 'right' }}>
                                  <Typography variant="caption">₹{m.value.toLocaleString('en-IN')}</Typography>
                                </Grid>
                              </React.Fragment>
                            ))}
                            {metalPreview.diamondValue > 0 && (
                              <>
                                <Grid item xs={8}><Typography variant="caption" sx={{ color: '#666' }}>Diamond Value</Typography></Grid>
                                <Grid item xs={4} sx={{ textAlign: 'right' }}><Typography variant="caption">₹{metalPreview.diamondValue.toLocaleString('en-IN')}</Typography></Grid>
                              </>
                            )}
                            <Grid item xs={8}><Typography variant="caption" sx={{ color: '#666' }}>Making ({metalPreview.mcType === 'percentage' ? `${metalPreview.mcValue}%` : `₹${metalPreview.mcValue}`})</Typography></Grid>
                            <Grid item xs={4} sx={{ textAlign: 'right' }}><Typography variant="caption">₹{metalPreview.makingChargeAmount.toLocaleString('en-IN')}</Typography></Grid>
                            {metalPreview.wastageChargeAmount > 0 && (
                              <>
                                <Grid item xs={8}><Typography variant="caption" sx={{ color: '#666' }}>Wastage ({metalPreview.wcType === 'percentage' ? `${metalPreview.wcValue}%` : `₹${metalPreview.wcValue}`})</Typography></Grid>
                                <Grid item xs={4} sx={{ textAlign: 'right' }}><Typography variant="caption">₹{metalPreview.wastageChargeAmount.toLocaleString('en-IN')}</Typography></Grid>
                              </>
                            )}
                            <Grid item xs={8}><Typography variant="caption" sx={{ color: '#666' }}>GST ({metalPreview.jewelryTaxRate}% + {metalPreview.makingTaxRate}%)</Typography></Grid>
                            <Grid item xs={4} sx={{ textAlign: 'right' }}><Typography variant="caption">₹{metalPreview.totalTax.toLocaleString('en-IN')}</Typography></Grid>
                            {metalPreview.discount > 0 && (
                              <>
                                <Grid item xs={8}><Typography variant="caption" sx={{ color: '#4CAF50' }}>Discount</Typography></Grid>
                                <Grid item xs={4} sx={{ textAlign: 'right' }}><Typography variant="caption" sx={{ color: '#4CAF50' }}>-₹{metalPreview.discount.toLocaleString('en-IN')}</Typography></Grid>
                              </>
                            )}
                            <Grid item xs={12}><Divider sx={{ my: 0.3 }} /></Grid>
                            <Grid item xs={8}><Typography variant="caption" sx={{ fontWeight: 'bold', color: '#1E1B4B' }}>Final Price</Typography></Grid>
                            <Grid item xs={4} sx={{ textAlign: 'right' }}><Typography variant="caption" sx={{ fontWeight: 'bold', color: '#1E1B4B' }}>₹{metalPreview.finalPrice.toLocaleString('en-IN')}</Typography></Grid>
                          </Grid>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}

            {formData.metalEntries.length < materials.length && (
              <Button size="small" startIcon={<Add />} onClick={handleAddMetalEntry}
                sx={{ ...buttonSx, color: '#fff', mb: 2 }}
                variant="contained"
              >
                Add Metal Type
              </Button>
            )}

            {/* Fixed Metals */}
            <Typography variant="body2" sx={{ color: '#666', mb: 1, mt: 1 }}>
              Fixed Metals (always present, not selectable)
            </Typography>
            {formData.fixedMetals.map((fm, fIdx) => (
              <Box key={`fm-${fIdx}`} sx={{ mb: 2, p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs={3}>
                    <TextField select fullWidth size="small" label="Type" value={fm.type}
                      onChange={(e) => handleFixedMetalChange(fIdx, 'type', e.target.value)}
                      sx={{ minWidth: 100 }}
                    >
                      {materials.map((m) => <MenuItem key={`fm-${fIdx}-${m}`} value={m}>{m}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={3}>
                    <TextField select fullWidth size="small" label="Purity" value={fm.purity}
                      onChange={(e) => handleFixedMetalChange(fIdx, 'purity', e.target.value)}
                      disabled={!fm.type}
                      sx={{ minWidth: 130 }}
                    >
                      {getPuritiesForMetal(fm.type).map((p) => (
                        <MenuItem key={p} value={p}>{purityLabels[p] || p}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={2}>
                    <TextField fullWidth size="small" label="Default Net Wt" type="number" value={fm.netWeight}
                      onChange={(e) => handleFixedMetalChange(fIdx, 'netWeight', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField fullWidth size="small" label="Default Gross Wt" type="number" value={fm.grossWeight}
                      onChange={(e) => handleFixedMetalChange(fIdx, 'grossWeight', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <IconButton size="small" onClick={() => handleRemoveFixedMetal(fIdx)} sx={{ color: '#d32f2f', mt: 0.5 }}>
                      <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Grid>
                </Grid>
                {getAvailableSizes().length > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#666', fontWeight: 500 }}>
                      Per-Size Weights
                    </Typography>
                    {getAvailableSizes().map((sz) => {
                      const sizeRow = fm.sizes?.find((s) => String(s.size) === String(sz)) || {};
                      return (
                        <Grid container spacing={1} key={sz} sx={{ mt: 0.5 }} alignItems="center">
                          <Grid item xs={2}>
                            <Chip label={`Size ${sz}`} size="small" sx={{ fontSize: '0.7rem' }} />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField size="small" fullWidth label="Net Wt" type="number"
                              value={sizeRow.netWeight || ''}
                              onChange={(e) => handleFixedMetalSizeChange(fIdx, sz, 'netWeight', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField size="small" fullWidth label="Gross Wt" type="number"
                              value={sizeRow.grossWeight || ''}
                              onChange={(e) => handleFixedMetalSizeChange(fIdx, sz, 'grossWeight', e.target.value)}
                            />
                          </Grid>
                        </Grid>
                      );
                    })}
                  </Box>
                )}
              </Box>
            ))}
            <Button size="small" startIcon={<Add />} onClick={handleAddFixedMetal}
              sx={{ textTransform: 'none', color: '#1E1B4B' }}
            >
              Add Fixed Metal
            </Button>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Section 4: Diamond Details */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, cursor: 'pointer' }}
            onClick={() => {
              setShowDiamond(!showDiamond);
              if (!showDiamond) setFormData({ ...formData, hasDiamond: true });
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1E1B4B' }}>
              Diamond Details
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch
                checked={formData.hasDiamond}
                onChange={(e) => {
                  setFormData({ ...formData, hasDiamond: e.target.checked });
                  setShowDiamond(e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#1E1B4B' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#1E1B4B' } }}
              />
              {showDiamond ? <ExpandLess /> : <ExpandMore />}
            </Box>
          </Box>

          {showDiamond && formData.hasDiamond && (
            <Box sx={{ mb: 3 }}>
              {/* Diamond Variants */}
              {formData.diamondVariants.map((variant, index) => (
                <Box key={index} sx={{ mb: 1.5, p: 2, backgroundColor: '#f9f9f9', borderRadius: 2, position: 'relative' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="body2" sx={{ color: '#666', fontWeight: 'bold' }}>
                      Diamond Variant {index + 1}
                    </Typography>
                    {formData.diamondVariants.length > 1 && (
                      <IconButton size="small" onClick={() => handleRemoveDiamondVariant(index)} sx={{ color: '#d32f2f' }}>
                        <Close sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <TextField fullWidth size="small" label="Count" type="number"
                        value={variant.count}
                        onChange={(e) => handleDiamondVariantChange(index, 'count', e.target.value)}
                        placeholder="No. of stones"
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField fullWidth size="small" select label="Shape"
                        value={variant.shape}
                        onChange={(e) => handleDiamondVariantChange(index, 'shape', e.target.value)}
                        sx={{ minWidth: 140 }}
                      >
                        {diamondShapes.map((s) => (
                          <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField fullWidth size="small" label="Total Wt (ct)" type="number"
                        value={variant.caratWeight}
                        onChange={(e) => handleDiamondVariantChange(index, 'caratWeight', e.target.value)}
                        placeholder="Carat weight"
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField fullWidth size="small" select label="Setting Type"
                        value={variant.settingType}
                        onChange={(e) => handleDiamondVariantChange(index, 'settingType', e.target.value)}
                        sx={{ minWidth: 140 }}
                      >
                        {settingTypes.map((s) => (
                          <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <TextField fullWidth size="small" select label="Clarity"
                        value={variant.clarity}
                        onChange={(e) => handleDiamondVariantChange(index, 'clarity', e.target.value)}
                        sx={{ minWidth: 140 }}
                      >
                        {diamondClarities.map((c) => (
                          <MenuItem key={c} value={c}>{c}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <TextField fullWidth size="small" select label="Color"
                        value={variant.color}
                        onChange={(e) => handleDiamondVariantChange(index, 'color', e.target.value)}
                        sx={{ minWidth: 140 }}
                      >
                        {diamondColors.map((c) => (
                          <MenuItem key={c} value={c}>{c}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth size="small" label="Cut"
                        value={variant.cut}
                        onChange={(e) => handleDiamondVariantChange(index, 'cut', e.target.value)}
                        placeholder="e.g., Round Brilliant"
                      />
                    </Grid>
                    {variant.clarity && variant.color && metalRates?.diamond && (
                      <Grid item xs={12}>
                        <Box sx={{ backgroundColor: '#EDE7F6', borderRadius: 1, px: 1.5, py: 0.75, display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" sx={{ color: '#333' }}>
                            {variant.clarity} → <strong>{clarityBucketMap[variant.clarity] || '?'}</strong>,{' '}
                            {variant.color} → <strong>{colorBucketMap[variant.color] || '?'}</strong>{' '}
                            = Rate bucket: <strong>{clarityBucketMap[variant.clarity]}-{colorBucketMap[variant.color]}</strong>
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              ))}

              <Button size="small" startIcon={<Add />} onClick={handleAddDiamondVariant}
                sx={{ textTransform: 'none', color: '#1E1B4B', mb: 2 }}
              >
                Add Diamond Variant
              </Button>

              {/* Diamond Totals */}
              {(() => {
                const { totalCount, totalWeight } = getDiamondTotals(); return (
                  totalCount > 0 || totalWeight > 0 ? (
                    <Box sx={{ display: 'flex', gap: 3, mb: 2, px: 1 }}>
                      <Typography variant="body2" sx={{ color: '#333' }}>
                        <strong>Total Diamonds:</strong> {totalCount}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#333' }}>
                        <strong>Total Weight:</strong> {totalWeight} ct
                      </Typography>
                    </Box>
                  ) : null
                );
              })()}

              <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

              {/* Certification (product level) */}
              <Typography variant="body2" sx={{ color: '#666', fontWeight: 'bold', mb: 1.5 }}>Diamond Certification</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth size="small" label="Certification"
                    value={formData.diamondCertification}
                    onChange={(e) => setFormData({ ...formData, diamondCertification: e.target.value })}
                    placeholder="e.g., GIA, IGI"
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          <Divider sx={{ mb: 3 }} />

          {/* Section 5: Images */}
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1E1B4B', mb: 2 }}>
            Product Images (max 10)
          </Typography>
          <Button
            variant="outlined"
            component="label"
            startIcon={<ImageIcon />}
            sx={{ borderColor: '#1E1B4B', color: '#1E1B4B', textTransform: 'none', mb: 2 }}
            disabled={existingImages.length + imageFiles.length >= 10}
          >
            Upload Images ({existingImages.length + imageFiles.length}/10)
            <input type="file" hidden multiple accept="image/*" onChange={handleImageChange} />
          </Button>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
            {existingImages.map((img, index) => (
              <Box key={`existing-${index}`} sx={{ position: 'relative', width: 90, height: 90 }}>
                <img
                  src={typeof img === 'string' ? img : img.url}
                  alt={`Product ${index + 1}`}
                  style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }}
                />
                <IconButton size="small"
                  onClick={() => removeExistingImage(index)}
                  sx={{
                    position: 'absolute', top: -8, right: -8, backgroundColor: '#d32f2f', color: 'white', width: 22, height: 22,
                    '&:hover': { backgroundColor: '#b71c1c' }
                  }}
                >
                  <Close sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            ))}
            {imagePreviews.map((url, index) => (
              <Box key={`new-${index}`} sx={{ position: 'relative', width: 90, height: 90 }}>
                <img
                  src={url}
                  alt={`New ${index + 1}`}
                  style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: '2px dashed #1E1B4B' }}
                />
                <IconButton size="small"
                  onClick={() => removeNewImage(index)}
                  sx={{
                    position: 'absolute', top: -8, right: -8, backgroundColor: '#d32f2f', color: 'white', width: 22, height: 22,
                    '&:hover': { backgroundColor: '#b71c1c' }
                  }}
                >
                  <Close sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            ))}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Section 6: Shared Charges */}
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1E1B4B', mb: 2 }}>
            Shared Charges
          </Typography>
          <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1.5, mt: -1 }}>
            Making charges, wastage, and tax are set per metal type above. Below are shared charges across all metals.
          </Typography>
          <Box sx={{ mb: 3 }}>
            {/* Shared charges — always visible */}
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: '#666', fontWeight: 'bold' }}>
                  Charges
                </Typography>
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField fullWidth size="small" type="number" label="Stone Setting (₹)"
                  value={formData.stoneSettingCharges}
                  onChange={(e) => setFormData({ ...formData, stoneSettingCharges: e.target.value })}
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField fullWidth size="small" type="number" label="Design Charges (₹)"
                  value={formData.designCharges}
                  onChange={(e) => setFormData({ ...formData, designCharges: e.target.value })}
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField fullWidth size="small" type="number" label="Discount (₹)"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label="HUID Number"
                  value={formData.huidNumber}
                  onChange={(e) => setFormData({ ...formData, huidNumber: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Section 7: Price Breakup */}
          {(() => {
            const defaultEntry = formData.metalEntries.find(
              (e) => e.type.toLowerCase() === formData.defaultMetalType.toLowerCase()
            ) || formData.metalEntries[0];
            if (!defaultEntry) return null;
            const defaultVariant = defaultEntry.purityVariants?.find(
              (v) => v.purity === formData.defaultPurity
            ) || defaultEntry.purityVariants?.[0];
            const previewSize = defaultVariant?.defaultSize || null;
            const bp = calculateMetalEntryPreview(defaultEntry, previewSize);
            if (!bp) return null;
            const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
            const row = (label, value, bold = false, color = undefined) => (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4 }}>
                <Typography variant="body2" sx={{ color: color || '#555', fontWeight: bold ? 700 : 400 }}>{label}</Typography>
                <Typography variant="body2" sx={{ color: color || '#333', fontWeight: bold ? 700 : 400 }}>{value}</Typography>
              </Box>
            );
            return (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1E1B4B' }}>
                    Price Breakup
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#888' }}>
                    {bp.variantLabel}{previewSize ? ` · Size ${previewSize}` : ''}
                  </Typography>
                </Box>
                <Box sx={{ background: '#f9f9f9', borderRadius: 1, p: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#1E1B4B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Metals</Typography>
                  {bp.metalBreakdown.map((m, idx) => (
                    <React.Fragment key={`m-${idx}`}>{row(
                      `${m.type.charAt(0).toUpperCase() + m.type.slice(1)} ${m.purity}${m.isFixed ? ' [Fixed]' : ''} (${m.weight}g @ ₹${m.rate.toLocaleString('en-IN')}/g)`,
                      fmt(m.value)
                    )}</React.Fragment>
                  ))}
                  {bp.diamondValue > 0 && <>
                    <Divider sx={{ my: 0.5 }} />
                    <Typography variant="caption" sx={{ color: '#1E1B4B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Diamond</Typography>
                    {bp.diamondBreakdown.map((d, idx) => (
                      <React.Fragment key={`d-${idx}`}>{row(
                        `${d.clarity} ${d.color} (${d.weight}ct @ ₹${d.rate.toLocaleString('en-IN')}/ct)`,
                        fmt(d.value)
                      )}</React.Fragment>
                    ))}
                    {bp.diamondBreakdown.length === 0 && row('Diamond value', fmt(bp.diamondValue))}
                  </>}
                  <Divider sx={{ my: 0.5 }} />
                  {row(`Making (${bp.mcType === 'percentage' ? bp.mcValue + '%' : bp.mcType === 'flat_per_gram' ? '₹' + bp.mcValue + '/g' : '₹' + bp.mcValue})`, fmt(bp.makingChargeAmount))}
                  {bp.wastageChargeAmount > 0 && row(`Wastage (${bp.wcType === 'percentage' ? bp.wcValue + '%' : '₹' + bp.wcValue})`, fmt(bp.wastageChargeAmount))}
                  {bp.stoneSettingCharges > 0 && row('Stone Setting', fmt(bp.stoneSettingCharges))}
                  {bp.designCharges > 0 && row('Design Charges', fmt(bp.designCharges))}
                  <Divider sx={{ my: 0.5 }} />
                  {row('Subtotal', fmt(bp.subtotal))}
                  {row(`GST Jewelry (${bp.jewelryTaxRate}%)`, fmt(bp.jewelryTax))}
                  {row(`GST Making (${bp.makingTaxRate}%)`, fmt(bp.labourTax))}
                  {bp.discount > 0 && row('Discount', `-${fmt(bp.discount)}`)}
                  <Divider sx={{ my: 0.5 }} />
                  {row('Final Price', fmt(bp.finalPrice), true, '#2e7d32')}
                </Box>
              </Box>
            );
          })()}

          <Divider sx={{ mb: 3 }} />

          {/* Section 8: Status */}
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1E1B4B', mb: 2 }}>
            Status
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" select label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="out_of_stock">Out of Stock</MenuItem>
                <MenuItem value="coming_soon">Coming Soon</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={<Switch checked={formData.featured} onChange={(e) => setFormData({ ...formData, featured: e.target.checked })} />}
                  label="Featured (DP Signature)"
                />
                <FormControlLabel
                  control={<Switch checked={formData.bestseller} onChange={(e) => setFormData({ ...formData, bestseller: e.target.checked })} />}
                  label="Bestseller"
                />
                <FormControlLabel
                  control={<Switch checked={formData.newArrival} onChange={(e) => setFormData({ ...formData, newArrival: e.target.checked })} />}
                  label="New Arrival"
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none', color: '#666' }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving} sx={buttonSx}>
            {saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : editingProduct ? 'Update Product' : 'Add Product'}
          </Button>
        </DialogActions>
      </Dialog>
    </div >
  );
}
