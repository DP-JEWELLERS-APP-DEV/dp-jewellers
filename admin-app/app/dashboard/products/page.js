'use client';

import React, { useState, useEffect, useRef } from 'react';
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
const emptyMetalVariant = { type: '', purity: '', netWeight: '', grossWeight: '', goldOptions: [] };
const emptyPurityVariant = {
  purity: '', netWeight: '', grossWeight: '',
  availableColors: [], defaultColor: '',
  availableDiamondQualities: [], defaultDiamondQuality: 'SI_IJ',
  sizes: [], defaultSize: '',
};
const emptyPurityVariantSize = { size: '', netWeight: '', grossWeight: '' };
const emptyFixedMetal = { type: '', purity: '', netWeight: '', grossWeight: '' };
const emptySizeWeight = { size: '', netWeight: '', grossWeight: '' };

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
  // Multi-metal support
  metalVariants: [{ type: '', purity: '', netWeight: '', grossWeight: '', goldOptions: [] }],
  hasDiamond: false,
  diamondVariants: [{ count: '', shape: '', caratWeight: '', settingType: '', clarity: '', color: '', cut: '' }],
  diamondCertification: '',
  sizes: [],
  sizeWeights: [],
  defaultSize: '',
  makingChargeType: 'percentage',
  makingChargeValue: '',
  wastageChargeType: 'percentage',
  wastageChargeValue: '',
  jewelryGst: '',
  makingGst: '',
  stoneSettingCharges: '',
  designCharges: '',
  discount: '',
  huidNumber: '',
  stoneDetails: '',
  status: 'active',
  // Configurator fields (v2 - purity-centric)
  configuratorEnabled: false,
  configurableMetalType: 'Gold',
  configDefaultPurity: '',
  purityVariants: [],          // [{ purity, netWeight, grossWeight, availableColors, defaultColor, availableDiamondQualities, defaultDiamondQuality, sizes[], defaultSize }]
  fixedMetals: [],             // [{ type, purity, netWeight, grossWeight }]
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
      const metal = product.metal || {};
      const metals = product.metals || [];
      const diamond = product.diamond || {};
      const pricing = product.pricing || {};
      const tax = product.tax || {};

      // Convert legacy single metal to multi-metal format
      let metalVariants;
      if (metals.length > 0) {
        metalVariants = metals.map(m => ({
          type: m.type ? m.type.charAt(0).toUpperCase() + m.type.slice(1) : '',
          purity: m.purity || m.silverType || '',
          netWeight: m.netWeight || '',
          grossWeight: m.grossWeight || '',
          goldOptions: m.goldOptions || [],
        }));
      } else if (metal.type) {
        metalVariants = [{
          type: metal.type.charAt(0).toUpperCase() + metal.type.slice(1),
          purity: metal.purity || metal.silverType || '',
          netWeight: metal.netWeight || '',
          grossWeight: metal.grossWeight || '',
          goldOptions: product.goldOptions || [],
        }];
      } else {
        metalVariants = [{ ...emptyMetalVariant }];
      }

      // Deserialize configurator (v2 purity-centric)
      const configurator = product.configurator || {};
      const cfgEnabled = Boolean(configurator?.enabled);
      let purityVariants = [];
      let fixedMetalsData = [];
      let configurableMetalType = 'Gold';
      let configDefaultPurity = '';

      if (cfgEnabled && configurator.configurableMetal) {
        // New v2 format
        const cm = configurator.configurableMetal;
        configurableMetalType = cm.type ? cm.type.charAt(0).toUpperCase() + cm.type.slice(1) : 'Gold';
        configDefaultPurity = cm.defaultPurity || '';
        purityVariants = (cm.variants || []).map((v) => ({
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
        fixedMetalsData = (configurator.fixedMetals || []).map((fm) => ({
          type: fm.type ? fm.type.charAt(0).toUpperCase() + fm.type.slice(1) : '',
          purity: fm.purity || '',
          netWeight: fm.netWeight || '',
          grossWeight: fm.grossWeight || '',
        }));
      } else if (cfgEnabled && configurator.metalOptions) {
        // Old v1 format - migrate on load
        const oldMeta = configurator.metalOptions || [];
        const primary = oldMeta[0] || {};
        configurableMetalType = primary.type ? primary.type.charAt(0).toUpperCase() + primary.type.slice(1) : 'Gold';
        const oldPurities = primary.availablePurities || [];
        configDefaultPurity = primary.defaultPurity || oldPurities[0] || '';
        purityVariants = oldPurities.map((p) => ({
          purity: p,
          netWeight: primary.baseNetWeight || '',
          grossWeight: primary.baseGrossWeight || '',
          availableColors: primary.availableColors || [],
          defaultColor: primary.defaultColor || '',
          availableDiamondQualities: configurator.diamondOptions?.availableQualities || [],
          defaultDiamondQuality: configurator.diamondOptions?.defaultQuality || 'SI_IJ',
          sizes: (configurator.sizeWeights || []).map((sw) => ({
            size: sw.size || '', netWeight: String((primary.baseNetWeight || 0) + (sw.weightAdjustment || 0)), grossWeight: '',
          })),
          defaultSize: configurator.defaultSize || '',
        }));
        fixedMetalsData = oldMeta.slice(1).map((m) => ({
          type: m.type ? m.type.charAt(0).toUpperCase() + m.type.slice(1) : '',
          purity: m.defaultPurity || '',
          netWeight: m.baseNetWeight || '',
          grossWeight: m.baseGrossWeight || '',
        }));
      }

      setFormData({
        name: product.name || '',
        productCode: product.productCode || '',
        category: product.category || '',
        subCategory: product.subCategory || '',
        description: product.description || '',
        metalVariants,
        hasDiamond: diamond.hasDiamond || false,
        diamondVariants: diamond.variants?.length > 0
          ? diamond.variants.map(v => ({ count: v.count || '', shape: v.shape || '', caratWeight: v.caratWeight || '', settingType: v.settingType || '', clarity: v.clarity || diamond.clarity || '', color: v.color || diamond.color || '', cut: v.cut || diamond.cut || '' }))
          : [{ count: '', shape: '', caratWeight: diamond.totalCaratWeight || '', settingType: '', clarity: diamond.clarity || '', color: diamond.color || '', cut: diamond.cut || '' }],
        diamondCertification: diamond.certification || '',
        sizes: product.sizes || [],
        sizeWeights: (product.sizeWeights || []).map((sw) => ({
          size: sw.size || '', netWeight: sw.netWeight || '', grossWeight: sw.grossWeight || '',
        })),
        defaultSize: product.defaultSize || '',
        makingChargeType: pricing.makingChargeType || 'percentage',
        makingChargeValue: pricing.makingChargeValue || '',
        wastageChargeType: pricing.wastageChargeType || 'percentage',
        wastageChargeValue: pricing.wastageChargeValue || '',
        jewelryGst: tax.jewelryGst || '',
        makingGst: tax.makingGst || '',
        stoneSettingCharges: pricing.stoneSettingCharges || '',
        designCharges: pricing.designCharges || '',
        discount: pricing.discount || '',
        huidNumber: product.certifications?.certificateNumber || '',
        stoneDetails: product.gemstones?.length > 0 ? product.gemstones.map(g => `${g.caratWeight || ''} ct ${g.type || ''}`).join(', ') : '',
        status: product.status || (product.isActive !== false ? 'active' : 'inactive'),
        configuratorEnabled: cfgEnabled,
        configurableMetalType,
        configDefaultPurity,
        purityVariants,
        fixedMetals: fixedMetalsData,
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

  // Metal variant handlers
  const handleAddMetalVariant = () => {
    setFormData((prev) => ({
      ...prev,
      metalVariants: [...prev.metalVariants, { ...emptyMetalVariant }],
    }));
  };

  const handleRemoveMetalVariant = (index) => {
    setFormData((prev) => ({
      ...prev,
      metalVariants: prev.metalVariants.filter((_, i) => i !== index),
    }));
  };

  const handleMetalVariantChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      metalVariants: prev.metalVariants.map((v, i) =>
        i === index ? { ...v, [field]: value, ...(field === 'type' ? { purity: '' } : {}) } : v
      ),
    }));
  };

  const handleGoldOptionToggle = (index, option) => {
    setFormData((prev) => ({
      ...prev,
      metalVariants: prev.metalVariants.map((v, i) => {
        if (i !== index) return v;
        const current = v.goldOptions || [];
        if (current.includes(option)) {
          return { ...v, goldOptions: current.filter((o) => o !== option) };
        }
        return { ...v, goldOptions: [...current, option] };
      }),
    }));
  };

  const handleConfiguratorToggle = (checked) => {
    setFormData((prev) => ({
      ...prev,
      configuratorEnabled: checked,
    }));
  };

  // --- Purity Variant Handlers ---
  const handleAddPurityVariant = () => {
    setFormData((prev) => ({
      ...prev,
      purityVariants: [...prev.purityVariants, { ...emptyPurityVariant }],
    }));
  };

  const handleRemovePurityVariant = (index) => {
    setFormData((prev) => {
      const removed = prev.purityVariants[index];
      return {
        ...prev,
        purityVariants: prev.purityVariants.filter((_, i) => i !== index),
        configDefaultPurity: prev.configDefaultPurity === removed?.purity
          ? (prev.purityVariants.find((_, i) => i !== index)?.purity || '')
          : prev.configDefaultPurity,
      };
    });
  };

  const handlePurityVariantChange = (variantIndex, field, value) => {
    setFormData((prev) => ({
      ...prev,
      purityVariants: prev.purityVariants.map((v, i) =>
        i === variantIndex ? { ...v, [field]: value } : v
      ),
    }));
  };

  const handlePurityVariantColorToggle = (variantIndex, color) => {
    setFormData((prev) => ({
      ...prev,
      purityVariants: prev.purityVariants.map((v, i) => {
        if (i !== variantIndex) return v;
        const current = v.availableColors || [];
        const next = current.includes(color)
          ? current.filter((c) => c !== color)
          : [...current, color];
        return {
          ...v,
          availableColors: next,
          defaultColor: next.includes(v.defaultColor) ? v.defaultColor : (next[0] || ''),
        };
      }),
    }));
  };

  const handlePurityVariantDiamondToggle = (variantIndex, quality) => {
    setFormData((prev) => ({
      ...prev,
      purityVariants: prev.purityVariants.map((v, i) => {
        if (i !== variantIndex) return v;
        const current = v.availableDiamondQualities || [];
        const next = current.includes(quality)
          ? current.filter((q) => q !== quality)
          : [...current, quality];
        return {
          ...v,
          availableDiamondQualities: next,
          defaultDiamondQuality: next.includes(v.defaultDiamondQuality)
            ? v.defaultDiamondQuality : (next[0] || 'SI_IJ'),
        };
      }),
    }));
  };

  const handleAddVariantSize = (variantIndex) => {
    setFormData((prev) => ({
      ...prev,
      purityVariants: prev.purityVariants.map((v, i) =>
        i === variantIndex
          ? { ...v, sizes: [...v.sizes, { ...emptyPurityVariantSize }] }
          : v
      ),
    }));
  };

  const handleRemoveVariantSize = (variantIndex, sizeIndex) => {
    setFormData((prev) => ({
      ...prev,
      purityVariants: prev.purityVariants.map((v, i) =>
        i === variantIndex
          ? { ...v, sizes: v.sizes.filter((_, si) => si !== sizeIndex) }
          : v
      ),
    }));
  };

  const handleVariantSizeChange = (variantIndex, sizeIndex, field, value) => {
    setFormData((prev) => ({
      ...prev,
      purityVariants: prev.purityVariants.map((v, i) =>
        i === variantIndex
          ? { ...v, sizes: v.sizes.map((s, si) => si === sizeIndex ? { ...s, [field]: value } : s) }
          : v
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

  const handleAddSizeWeight = () => {
    setFormData((prev) => ({
      ...prev,
      sizeWeights: [...prev.sizeWeights, { ...emptySizeWeight }],
    }));
  };

  const handleRemoveSizeWeight = (index) => {
    setFormData((prev) => ({
      ...prev,
      sizeWeights: prev.sizeWeights.filter((_, i) => i !== index),
    }));
  };

  const handleSizeWeightChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      sizeWeights: prev.sizeWeights.map((sw, i) => i === index ? { ...sw, [field]: value } : sw),
    }));
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

  const calculatePreviewPrice = () => {
    const hasValidMetal = formData.metalVariants?.some(m => m.type && m.netWeight);
    if (!metalRates || !hasValidMetal) return null;

    let metalValue = 0;
    const metalBreakdown = [];

    for (const metal of formData.metalVariants) {
      if (!metal.type || !metal.netWeight) continue;
      const materialType = metal.type.toLowerCase();
      let ratePerGram = 0;

      if (materialType === 'gold' && metal.purity && metalRates.gold) {
        ratePerGram = metalRates.gold[metal.purity] || 0;
      } else if (materialType === 'silver' && metal.purity && metalRates.silver) {
        ratePerGram = metalRates.silver[metal.purity] || 0;
      } else if (materialType === 'platinum' && metalRates.platinum) {
        ratePerGram = metalRates.platinum?.['950'] || metalRates.platinum?.perGram || 0;
      }

      const value = (Number(metal.netWeight) || 0) * ratePerGram;
      metalValue += value;
      metalBreakdown.push({
        type: metal.type,
        purity: metal.purity,
        weight: Number(metal.netWeight) || 0,
        rate: ratePerGram,
        value: Math.round(value),
      });
    }

    const totalNetWeight = formData.metalVariants.reduce((sum, m) => sum + (Number(m.netWeight) || 0), 0);

    let diamondValue = 0;
    const diamondBreakdown = [];
    if (formData.hasDiamond && metalRates.diamond) {
      for (const variant of formData.diamondVariants) {
        if (!variant.caratWeight) continue;
        const vClarity = clarityBucketMap[variant.clarity] || 'SI';
        const vColor = colorBucketMap[variant.color] || 'IJ';
        const vRateKey = `${vClarity}_${vColor}`;
        const vRate = metalRates.diamond[vRateKey] || metalRates.diamond['SI_IJ'] || 0;
        const variantValue = (Number(variant.caratWeight) || 0) * vRate;
        diamondValue += variantValue;
        if (variant.clarity && variant.color) {
          diamondBreakdown.push({
            clarity: variant.clarity,
            color: variant.color,
            bucket: `${vClarity}-${vColor}`,
            rate: vRate,
            weight: Number(variant.caratWeight) || 0,
            value: Math.round(variantValue),
          });
        }
      }
    }

    let makingChargeAmount = 0;
    const mcType = formData.makingChargeType;
    const mcValue = Number(formData.makingChargeValue) || 0;
    if (mcType === 'percentage') makingChargeAmount = metalValue * (mcValue / 100);
    else if (mcType === 'flat_per_gram') makingChargeAmount = totalNetWeight * mcValue;
    else if (mcType === 'fixed_amount') makingChargeAmount = mcValue;

    let wastageChargeAmount = 0;
    const wcType = formData.wastageChargeType;
    const wcValue = Number(formData.wastageChargeValue) || 0;
    if (wcType === 'percentage') wastageChargeAmount = metalValue * (wcValue / 100);
    else wastageChargeAmount = wcValue;

    const stoneSettingCharges = Number(formData.stoneSettingCharges) || 0;
    const designCharges = Number(formData.designCharges) || 0;

    const subtotal = metalValue + diamondValue + makingChargeAmount + wastageChargeAmount + stoneSettingCharges + designCharges;
    const discount = Number(formData.discount) || 0;

    const jewelryTaxRate = Number(formData.jewelryGst) || 3;
    const makingTaxRate = Number(formData.makingGst) || 5;

    const jewelryTaxable = metalValue + diamondValue;
    const labourTaxable = makingChargeAmount + wastageChargeAmount + stoneSettingCharges + designCharges;

    const jewelryTax = jewelryTaxable * (jewelryTaxRate / 100);
    const labourTax = labourTaxable * (makingTaxRate / 100);
    const totalTax = jewelryTax + labourTax;
    const finalPrice = Math.round(subtotal - discount + totalTax);

    return {
      metalBreakdown,
      metalValue: Math.round(metalValue),
      totalNetWeight,
      diamondValue: Math.round(diamondValue),
      diamondBreakdown,
      makingChargeAmount: Math.round(makingChargeAmount),
      wastageChargeAmount: Math.round(wastageChargeAmount),
      stoneSettingCharges,
      designCharges,
      subtotal: Math.round(subtotal),
      discount,
      jewelryTaxRate,
      makingTaxRate,
      jewelryTax: Math.round(jewelryTax),
      labourTax: Math.round(labourTax),
      totalTax: Math.round(totalTax),
      finalPrice,
    };
  };

  const pricePreview = calculatePreviewPrice() || {
    metalBreakdown: [],
    metalValue: 0,
    totalNetWeight: 0,
    diamondValue: 0,
    diamondBreakdown: [],
    makingChargeAmount: 0,
    wastageChargeAmount: 0,
    stoneSettingCharges: 0,
    designCharges: 0,
    subtotal: 0,
    discount: 0,
    jewelryTaxRate: Number(formData.jewelryGst) || 3,
    makingTaxRate: Number(formData.makingGst) || 5,
    jewelryTax: 0,
    labourTax: 0,
    totalTax: 0,
    finalPrice: 0,
  };

  const handleSubmit = async () => {
    setDialogError('');
    setFieldErrors({});

    // Validation
    const errors = {};
    if (!formData.name) errors.name = true;
    if (!formData.productCode) errors.productCode = true;
    if (!formData.category) errors.category = true;

    const hasValidMetal = formData.configuratorEnabled
      ? formData.purityVariants?.some(v => v.purity && v.netWeight)
      : formData.metalVariants?.some(m => m.type && m.purity && m.netWeight);
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

      // Build metals array from metalVariants
      const metals = formData.metalVariants
        .filter(m => m.type && m.netWeight)
        .map(m => ({
          type: m.type.toLowerCase(),
          purity: m.type === 'Gold' ? m.purity : undefined,
          silverType: m.type === 'Silver' ? m.purity : undefined,
          netWeight: Number(m.netWeight) || 0,
          grossWeight: Number(m.grossWeight) || 0,
          goldOptions: m.goldOptions || [],
        }));

      // For backward compatibility, also set single metal from first variant
      const firstMetal = metals[0] || {};
      const metal = {
        type: firstMetal.type,
        purity: firstMetal.purity,
        silverType: firstMetal.silverType,
        netWeight: firstMetal.netWeight,
        grossWeight: firstMetal.grossWeight,
      };

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

      const pricing = {};
      if (formData.makingChargeValue) {
        pricing.makingChargeType = formData.makingChargeType;
        pricing.makingChargeValue = Number(formData.makingChargeValue) || 0;
      }
      if (formData.wastageChargeValue) {
        pricing.wastageChargeType = formData.wastageChargeType;
        pricing.wastageChargeValue = Number(formData.wastageChargeValue) || 0;
      }
      if (formData.stoneSettingCharges) pricing.stoneSettingCharges = Number(formData.stoneSettingCharges) || 0;
      if (formData.designCharges) pricing.designCharges = Number(formData.designCharges) || 0;
      if (formData.discount) pricing.discount = Number(formData.discount) || 0;

      const tax = {};
      if (formData.jewelryGst) tax.jewelryGst = Number(formData.jewelryGst);
      if (formData.makingGst) tax.makingGst = Number(formData.makingGst);

      const productData = {
        name: formData.name,
        productCode: formData.productCode,
        category: formData.category,
        subCategory: formData.subCategory,
        description: formData.description,
        images: allImages,
        metal,
        metals,
        diamond,
        goldOptions: firstMetal.goldOptions || [],
        sizes: formData.sizeWeights.length > 0
          ? formData.sizeWeights.filter((sw) => sw.size).map((sw) => sw.size)
          : formData.sizes,
        sizeWeights: formData.sizeWeights
          .filter((sw) => sw.size)
          .map((sw) => ({
            size: sw.size,
            netWeight: Number(sw.netWeight) || 0,
            grossWeight: Number(sw.grossWeight) || 0,
          })),
        defaultSize: formData.defaultSize || '',
        tax,
        pricing,
        certifications: formData.huidNumber ? {
          hasCertificate: true,
          certificateNumber: formData.huidNumber,
        } : {},
        status: formData.status,
      };

      if (formData.configuratorEnabled) {
        const defaultVariant = formData.purityVariants.find(
          (v) => v.purity === formData.configDefaultPurity
        ) || formData.purityVariants[0];

        productData.configurator = {
          enabled: true,
          configurableMetal: {
            type: formData.configurableMetalType.toLowerCase(),
            defaultPurity: formData.configDefaultPurity,
            variants: formData.purityVariants
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
              })),
          },
          fixedMetals: (formData.fixedMetals || [])
            .filter((fm) => fm.type && fm.netWeight)
            .map((fm) => ({
              type: fm.type.toLowerCase(),
              purity: fm.purity || '',
              netWeight: Number(fm.netWeight) || 0,
              grossWeight: Number(fm.grossWeight) || 0,
            })),
        };

        // Backward compat: populate top-level metal/metals/sizes from default variant
        if (defaultVariant) {
          const mType = formData.configurableMetalType.toLowerCase();
          metal.type = mType;
          metal.purity = mType === 'gold' ? defaultVariant.purity : undefined;
          metal.silverType = mType === 'silver' ? defaultVariant.purity : undefined;
          metal.netWeight = Number(defaultVariant.netWeight) || 0;
          metal.grossWeight = Number(defaultVariant.grossWeight) || 0;
          productData.sizes = (defaultVariant.sizes || []).map((s) => s.size);
          productData.goldOptions = defaultVariant.availableColors || [];
        }
      } else {
        // Explicitly disable configurator so backend can clean up priceRange
        productData.configurator = { enabled: false };
      }

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
    if (filterCategory.length > 0 && !filterCategory.includes(p.category)) return false;
    const productMaterial = (p.metal?.type || '').charAt(0).toUpperCase() + (p.metal?.type || '').slice(1);
    if (filterMaterial.length > 0 && !filterMaterial.includes(productMaterial)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (p.name || '').toLowerCase().includes(q);
      const codeMatch = (p.productCode || '').toLowerCase().includes(q);
      if (!nameMatch && !codeMatch) return false;
    }
    return true;
  });

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  return (
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" className="font-bold" sx={{ color: '#1E1B4B' }}>
          Products Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={buttonSx}
        >
          Add Product
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Autocomplete
          multiple
          size="small"
          options={categories}
          value={filterCategory}
          onChange={(_, val) => setFilterCategory(val)}
          renderInput={(params) => <TextField {...params} label="Category" placeholder="Select" />}
          sx={{ minWidth: 220 }}
        />
        <Autocomplete
          multiple
          size="small"
          options={materials}
          value={filterMaterial}
          onChange={(_, val) => setFilterMaterial(val)}
          renderInput={(params) => <TextField {...params} label="Material" placeholder="Select" />}
          sx={{ minWidth: 220 }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search name or code"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            sx={{ minWidth: 220 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 20, color: '#999' }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{ ...buttonSx, minWidth: 'auto', px: 3 }}
          >
            Search
          </Button>
          {searchQuery && (
            <Button
              variant="outlined"
              onClick={() => { setSearchInput(''); setSearchQuery(''); }}
              sx={{ minWidth: 'auto', px: 2, textTransform: 'none', borderColor: '#1E1B4B', color: '#1E1B4B' }}
              startIcon={<Close sx={{ fontSize: 16 }} />}
            >
              Clear
            </Button>
          )}
        </Box>
      </Box>

      {success && <Alert severity="success" className="!mb-4" onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" className="!mb-4" onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#1E1B4B' }} />
        </Box>
      ) : (
        <Paper elevation={2} sx={{ backgroundColor: 'white', borderRadius: 2 }}>
          <DataGrid
            rows={filteredProducts}
            columns={[
              { field: 'productCode', headerName: 'Code', width: 120, sortable: true },
              { field: 'name', headerName: 'Name', flex: 1, minWidth: 150, sortable: true },
              { field: 'category', headerName: 'Category', width: 120, sortable: true },
              {
                field: 'material',
                headerName: 'Material',
                width: 100,
                sortable: true,
                valueGetter: (value, row) => row.metal?.type || '-',
              },
              {
                field: 'weight',
                headerName: 'Weight (g)',
                width: 100,
                sortable: true,
                valueGetter: (value, row) => row.metal?.netWeight || 0,
                renderCell: (params) => params.row.metal?.netWeight || '-',
              },
              {
                field: 'price',
                headerName: 'Price',
                width: 120,
                sortable: true,
                valueGetter: (value, row) => row.pricing?.finalPrice || 0,
                renderCell: (params) => params.row.pricing?.finalPrice
                  ? `₹${Number(params.row.pricing.finalPrice).toLocaleString('en-IN')}`
                  : '-',
              },
              {
                field: 'status',
                headerName: 'Status',
                width: 120,
                sortable: true,
                valueGetter: (value, row) => getProductStatus(row),
                renderCell: (params) => (
                  <Chip
                    label={getStatusLabel(getProductStatus(params.row))}
                    color={getStatusColor(getProductStatus(params.row))}
                    size="small"
                  />
                ),
              },
              {
                field: 'actions',
                headerName: 'Actions',
                width: 150,
                sortable: false,
                filterable: false,
                renderCell: (params) => (
                  <>
                    <Tooltip title="Edit product details" arrow>
                      <IconButton size="small" onClick={() => handleOpenDialog(params.row)} sx={{ color: '#1E1B4B', mr: 0.5 }}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Soft delete: Product will be permanently removed from the system" arrow>
                      <IconButton size="small" onClick={() => handleDelete(params.row.productId)} sx={{ color: '#d32f2f', mr: 0.5 }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {getProductStatus(params.row) !== 'archived' ? (
                      <Tooltip title="Archive: Product will be hidden from customers but can be restored later" arrow>
                        <IconButton size="small" onClick={() => handleArchive(params.row.productId)} sx={{ color: '#ed6c02' }}>
                          <Archive fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Restore: Make product visible to customers again" arrow>
                        <IconButton size="small" onClick={() => handleRestore(params.row.productId)} sx={{ color: '#2e7d32' }}>
                          <RestoreFromTrash fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </>
                ),
              },
            ]}
            getRowId={(row) => row.productId}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
              sorting: { sortModel: [{ field: 'name', sort: 'asc' }] },
            }}
            pageSizeOptions={[10, 25, 50]}
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
              },
            }}
            disableRowSelectionOnClick
            autoHeight
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f5f5f5', fontWeight: 'bold' },
              '& .MuiDataGrid-row:hover': { backgroundColor: '#f9f9f9' },
              '& .MuiDataGrid-toolbarContainer': { p: 2, gap: 2 },
            }}
            localeText={{ noRowsLabel: 'No products found. Add your first product!' }}
          />
        </Paper>
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

          {/* Section 2: Metal Details (hidden when configurator is on) */}
          {!formData.configuratorEnabled && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1E1B4B' }}>
              Metal Details
            </Typography>
            {fieldErrors.metalVariants && (
              <Chip label="At least one metal required" color="error" size="small" />
            )}
          </Box>
          )}
          {!formData.configuratorEnabled && (
          <Box sx={{ mb: 3 }}>
            {formData.metalVariants.map((metal, index) => (
              <Box key={index} sx={{ mb: 1.5, p: 2, backgroundColor: fieldErrors.metalVariants ? '#FFEBEE' : '#f9f9f9', borderRadius: 2, border: fieldErrors.metalVariants ? '1px solid #f44336' : 'none' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="body2" sx={{ color: '#666', fontWeight: 'bold' }}>
                    Metal {index + 1}
                  </Typography>
                  {formData.metalVariants.length > 1 && (
                    <IconButton size="small" onClick={() => handleRemoveMetalVariant(index)} sx={{ color: '#d32f2f' }}>
                      <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth size="small" select label="Material" required
                      value={metal.type}
                      onChange={(e) => handleMetalVariantChange(index, 'type', e.target.value)}
                      sx={{ minWidth: 120 }}
                    >
                      {materials.map((mat) => (
                        <MenuItem key={mat} value={mat}>{mat}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth size="small" select label="Purity" required
                      value={metal.purity}
                      onChange={(e) => handleMetalVariantChange(index, 'purity', e.target.value)}
                      disabled={!metal.type}
                      sx={{ minWidth: 120 }}
                    >
                      {getPuritiesForMetal(metal.type).map((p) => (
                        <MenuItem key={p} value={p}>{p.replace('_', ' ')}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth size="small" label="Net Wt (g)" type="number" required
                      value={metal.netWeight}
                      onChange={(e) => handleMetalVariantChange(index, 'netWeight', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth size="small" label="Gross Wt (g)" type="number"
                      value={metal.grossWeight}
                      onChange={(e) => handleMetalVariantChange(index, 'grossWeight', e.target.value)}
                    />
                  </Grid>
                  {metal.type === 'Gold' && (
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>Gold Options</Typography>
                      <FormGroup row>
                        {goldOptionsList.map((opt) => (
                          <FormControlLabel key={opt.value}
                            control={
                              <Checkbox
                                checked={(metal.goldOptions || []).includes(opt.value)}
                                onChange={() => handleGoldOptionToggle(index, opt.value)}
                                sx={{ color: '#1E1B4B', '&.Mui-checked': { color: '#1E1B4B' } }}
                              />
                            }
                            label={opt.label}
                          />
                        ))}
                      </FormGroup>
                    </Grid>
                  )}
                </Grid>
              </Box>
            ))}
            <Button size="small" startIcon={<Add />} onClick={handleAddMetalVariant}
              sx={{ textTransform: 'none', color: '#1E1B4B' }}
            >
              Add Another Metal
            </Button>
          </Box>
          )}

          <Divider sx={{ mb: 3 }} />

          {/* Section 3: Configurator Options */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1E1B4B' }}>
              Configurator Options
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.configuratorEnabled}
                  onChange={(e) => handleConfiguratorToggle(e.target.checked)}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#1E1B4B' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#1E1B4B' } }}
                />
              }
              label="Enable"
            />
          </Box>

          {formData.configuratorEnabled && (
            <Box sx={{ mb: 3 }}>
              {/* Configurable Metal Type & Default Purity */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={4}>
                  <TextField select fullWidth size="small" label="Configurable Metal Type"
                    value={formData.configurableMetalType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, configurableMetalType: e.target.value }))}
                    sx={{ minWidth: 160 }}
                  >
                    {materials.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField select fullWidth size="small" label="Default Purity"
                    value={formData.configDefaultPurity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, configDefaultPurity: e.target.value }))}
                    sx={{ minWidth: 140 }}
                  >
                    {formData.purityVariants.filter((v) => v.purity).map((v) => (
                      <MenuItem key={`cfg-dp-${v.purity}`} value={v.purity}>{v.purity}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              {fieldErrors.metalVariants && (
                <Chip label="At least one purity variant with weight is required" color="error" size="small" sx={{ mb: 2 }} />
              )}

              {/* Purity Variants */}
              {formData.purityVariants.map((variant, vIdx) => (
                <Box key={`pv-${vIdx}`} sx={{ mb: 2, p: 2, backgroundColor: '#f9f9f9', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1E1B4B' }}>
                      {variant.purity || `Variant ${vIdx + 1}`}
                    </Typography>
                    <IconButton size="small" onClick={() => handleRemovePurityVariant(vIdx)} sx={{ color: '#d32f2f' }}>
                      <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>

                  {/* Purity & Base Weights */}
                  <Grid container spacing={2} sx={{ mb: 1.5 }}>
                    <Grid item xs={4} sm={3}>
                      <TextField select fullWidth size="small" label="Purity"
                        value={variant.purity}
                        onChange={(e) => handlePurityVariantChange(vIdx, 'purity', e.target.value)}
                        sx={{ minWidth: 100 }}
                      >
                        {getPuritiesForMetal(formData.configurableMetalType).map((p) => (
                          <MenuItem key={`pv-${vIdx}-${p}`} value={p}>{p}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={4} sm={3}>
                      <TextField fullWidth size="small" label="Net Weight (g)" type="number"
                        value={variant.netWeight}
                        onChange={(e) => handlePurityVariantChange(vIdx, 'netWeight', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={4} sm={3}>
                      <TextField fullWidth size="small" label="Gross Weight (g)" type="number"
                        value={variant.grossWeight}
                        onChange={(e) => handlePurityVariantChange(vIdx, 'grossWeight', e.target.value)}
                      />
                    </Grid>
                  </Grid>

                  {/* Colors */}
                  <Typography variant="caption" sx={{ color: '#666' }}>Gold Colors</Typography>
                  <FormGroup row sx={{ mb: 1 }}>
                    {goldOptionsList.map((opt) => (
                      <FormControlLabel key={`pv-${vIdx}-color-${opt.value}`}
                        control={<Checkbox size="small"
                          checked={(variant.availableColors || []).includes(opt.value)}
                          onChange={() => handlePurityVariantColorToggle(vIdx, opt.value)}
                          sx={{ color: '#1E1B4B', '&.Mui-checked': { color: '#1E1B4B' } }}
                        />}
                        label={opt.label}
                      />
                    ))}
                    {(variant.availableColors || []).length > 1 && (
                      <TextField select size="small" label="Default Color" sx={{ ml: 2, minWidth: 170 }}
                        value={variant.defaultColor || ''}
                        onChange={(e) => handlePurityVariantChange(vIdx, 'defaultColor', e.target.value)}
                      >
                        {(variant.availableColors || []).map((c) => (
                          <MenuItem key={`pv-${vIdx}-dc-${c}`} value={c}>
                            {goldOptionsList.find((o) => o.value === c)?.label || c}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  </FormGroup>

                  {/* Diamond Qualities (only if product has diamonds) */}
                  {formData.hasDiamond && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ color: '#666' }}>Diamond Qualities</Typography>
                      <FormGroup row>
                        {diamondQualityBuckets.map((q) => (
                          <FormControlLabel key={`pv-${vIdx}-dq-${q}`}
                            control={<Checkbox size="small"
                              checked={(variant.availableDiamondQualities || []).includes(q)}
                              onChange={() => handlePurityVariantDiamondToggle(vIdx, q)}
                              sx={{ color: '#1E1B4B', '&.Mui-checked': { color: '#1E1B4B' } }}
                            />}
                            label={diamondQualityLabels[q] || q}
                          />
                        ))}
                      </FormGroup>
                      {(variant.availableDiamondQualities || []).length > 1 && (
                        <TextField select size="small" label="Default Diamond Quality" sx={{ minWidth: 210 }}
                          value={variant.defaultDiamondQuality || 'SI_IJ'}
                          onChange={(e) => handlePurityVariantChange(vIdx, 'defaultDiamondQuality', e.target.value)}
                        >
                          {(variant.availableDiamondQualities || []).map((q) => (
                            <MenuItem key={`pv-${vIdx}-ddq-${q}`} value={q}>{diamondQualityLabels[q] || q}</MenuItem>
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
                    <Grid container spacing={1} key={`pv-${vIdx}-sz-${sIdx}`} sx={{ mb: 0.5 }}>
                      <Grid item xs={3}>
                        <TextField size="small" fullWidth value={sz.size} placeholder="e.g., 14"
                          onChange={(e) => handleVariantSizeChange(vIdx, sIdx, 'size', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField size="small" fullWidth type="number" value={sz.netWeight} placeholder="2.5"
                          onChange={(e) => handleVariantSizeChange(vIdx, sIdx, 'netWeight', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField size="small" fullWidth type="number" value={sz.grossWeight} placeholder="2.8"
                          onChange={(e) => handleVariantSizeChange(vIdx, sIdx, 'grossWeight', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <IconButton size="small" onClick={() => handleRemoveVariantSize(vIdx, sIdx)} sx={{ color: '#d32f2f' }}>
                          <Close sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Grid>
                    </Grid>
                  ))}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                    <Button size="small" startIcon={<Add />} onClick={() => handleAddVariantSize(vIdx)}
                      sx={{ textTransform: 'none', color: '#1E1B4B' }}
                    >
                      Add Size
                    </Button>
                    {(variant.sizes || []).filter((s) => s.size).length > 0 && (
                      <TextField select size="small" label="Default Size" sx={{ minWidth: 150 }}
                        value={variant.defaultSize || ''}
                        onChange={(e) => handlePurityVariantChange(vIdx, 'defaultSize', e.target.value)}
                      >
                        {(variant.sizes || []).filter((s) => s.size).map((s) => (
                          <MenuItem key={`pv-${vIdx}-ds-${s.size}`} value={s.size}>{s.size}</MenuItem>
                        ))}
                      </TextField>
                    )}
                  </Box>
                </Box>
              ))}

              <Button size="small" startIcon={<Add />} onClick={handleAddPurityVariant}
                sx={{ textTransform: 'none', color: '#1E1B4B', mb: 2 }}
              >
                Add Purity Variant
              </Button>

              {/* Fixed Metals */}
              <Typography variant="body2" sx={{ color: '#666', mb: 1, mt: 1 }}>
                Fixed Metals (always present, not selectable)
              </Typography>
              {formData.fixedMetals.map((fm, fIdx) => (
                <Grid container spacing={1} key={`fm-${fIdx}`} sx={{ mb: 1 }}>
                  <Grid item xs={3}>
                    <TextField select fullWidth size="small" label="Type" value={fm.type}
                      onChange={(e) => handleFixedMetalChange(fIdx, 'type', e.target.value)}
                      sx={{ minWidth: 100 }}
                    >
                      {materials.map((m) => <MenuItem key={`fm-${fIdx}-${m}`} value={m}>{m}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={3}>
                    <TextField fullWidth size="small" label="Purity" value={fm.purity}
                      onChange={(e) => handleFixedMetalChange(fIdx, 'purity', e.target.value)}
                      placeholder={fm.type === 'Silver' ? '925' : fm.type === 'Platinum' ? '950' : ''}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField fullWidth size="small" label="Net Wt" type="number" value={fm.netWeight}
                      onChange={(e) => handleFixedMetalChange(fIdx, 'netWeight', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField fullWidth size="small" label="Gross Wt" type="number" value={fm.grossWeight}
                      onChange={(e) => handleFixedMetalChange(fIdx, 'grossWeight', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <IconButton size="small" onClick={() => handleRemoveFixedMetal(fIdx)} sx={{ color: '#d32f2f', mt: 0.5 }}>
                      <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button size="small" startIcon={<Add />} onClick={handleAddFixedMetal}
                sx={{ textTransform: 'none', color: '#1E1B4B' }}
              >
                Add Fixed Metal
              </Button>
            </Box>
          )}

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
              {(() => { const { totalCount, totalWeight } = getDiamondTotals(); return (
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
              ); })()}

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

          {/* Section 4: Size Options (hidden when configurator is on — sizes are per-variant) */}
          {showSizeField && !formData.configuratorEnabled && (
            <>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1E1B4B', mb: 2 }}>
                Size Options
              </Typography>
              {formData.sizeWeights.length > 0 && (
                <Grid container spacing={1} sx={{ mb: 0.5 }}>
                  <Grid item xs={3}><Typography variant="caption" sx={{ color: '#999' }}>{getSizeConfig(formData.category).label}</Typography></Grid>
                  <Grid item xs={3}><Typography variant="caption" sx={{ color: '#999' }}>Net Wt (g)</Typography></Grid>
                  <Grid item xs={3}><Typography variant="caption" sx={{ color: '#999' }}>Gross Wt (g)</Typography></Grid>
                  <Grid item xs={3} />
                </Grid>
              )}
              {formData.sizeWeights.map((sw, idx) => (
                <Grid container spacing={1} key={`sw-${idx}`} sx={{ mb: 0.5 }}>
                  <Grid item xs={3}>
                    <TextField size="small" fullWidth value={sw.size}
                      placeholder={getSizeConfig(formData.category).placeholder}
                      onChange={(e) => handleSizeWeightChange(idx, 'size', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField size="small" fullWidth type="number" value={sw.netWeight} placeholder="2.5"
                      onChange={(e) => handleSizeWeightChange(idx, 'netWeight', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField size="small" fullWidth type="number" value={sw.grossWeight} placeholder="2.8"
                      onChange={(e) => handleSizeWeightChange(idx, 'grossWeight', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <IconButton size="small" onClick={() => handleRemoveSizeWeight(idx)} sx={{ color: '#d32f2f' }}>
                      <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, mb: 3 }}>
                <Button size="small" startIcon={<Add />} onClick={handleAddSizeWeight}
                  sx={{ textTransform: 'none', color: '#1E1B4B' }}
                >
                  Add Size
                </Button>
                {formData.sizeWeights.filter((sw) => sw.size).length > 0 && (
                  <TextField select size="small" label="Default Size" sx={{ minWidth: 150 }}
                    value={formData.defaultSize || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultSize: e.target.value }))}
                  >
                    {formData.sizeWeights.filter((sw) => sw.size).map((sw) => (
                      <MenuItem key={`ds-${sw.size}`} value={sw.size}>{sw.size}</MenuItem>
                    ))}
                  </TextField>
                )}
              </Box>
              <Divider sx={{ mb: 3 }} />
            </>
          )}

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
                  sx={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#d32f2f', color: 'white', width: 22, height: 22,
                    '&:hover': { backgroundColor: '#b71c1c' } }}
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
                  sx={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#d32f2f', color: 'white', width: 22, height: 22,
                    '&:hover': { backgroundColor: '#b71c1c' } }}
                >
                  <Close sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            ))}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Section 6: Pricing & Charges */}
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1E1B4B', mb: 2 }}>
            Pricing & Charges
          </Typography>
          <Box sx={{ mb: 3 }}>
            {/* Making Charges Row */}
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: '#666', fontWeight: 'bold' }}>Making Charges</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" select label="Making Charge Type"
                  value={formData.makingChargeType}
                  onChange={(e) => setFormData({ ...formData, makingChargeType: e.target.value })}
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="percentage">Percentage (%)</MenuItem>
                  <MenuItem value="flat_per_gram">Per Gram (₹)</MenuItem>
                  <MenuItem value="fixed_amount">Fixed Amount (₹)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" type="number"
                  label={formData.makingChargeType === 'percentage' ? 'Making Charge (%)' : 'Making Charge (₹)'}
                  value={formData.makingChargeValue}
                  onChange={(e) => setFormData({ ...formData, makingChargeValue: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" label="HUID Number"
                  value={formData.huidNumber}
                  onChange={(e) => setFormData({ ...formData, huidNumber: e.target.value })}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

            {/* Wastage Charges Row */}
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: '#666', fontWeight: 'bold' }}>Wastage Charges</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" select label="Wastage Charge Type"
                  value={formData.wastageChargeType}
                  onChange={(e) => setFormData({ ...formData, wastageChargeType: e.target.value })}
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="percentage">Percentage (%)</MenuItem>
                  <MenuItem value="fixed">Fixed Amount (₹)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" type="number"
                  label={formData.wastageChargeType === 'percentage' ? 'Wastage Charge (%)' : 'Wastage Charge (₹)'}
                  value={formData.wastageChargeValue}
                  onChange={(e) => setFormData({ ...formData, wastageChargeValue: e.target.value })}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

            {/* Tax (GST) Row */}
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: '#666', fontWeight: 'bold' }}>Tax (GST)</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" type="number" label="GST on Jewelry (%)"
                  value={formData.jewelryGst}
                  onChange={(e) => setFormData({ ...formData, jewelryGst: e.target.value })}
                  placeholder="Default: 3%"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" type="number" label="GST on Making Charges (%)"
                  value={formData.makingGst}
                  onChange={(e) => setFormData({ ...formData, makingGst: e.target.value })}
                  placeholder="Default: 5%"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

            {/* Other Charges Row */}
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: '#666', fontWeight: 'bold' }}>Other Charges</Typography>
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
                <TextField fullWidth size="small" label="Stone Details"
                  value={formData.stoneDetails}
                  onChange={(e) => setFormData({ ...formData, stoneDetails: e.target.value })}
                  placeholder="e.g., 0.5 ct Diamond"
                />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Price Calculation Preview - Always visible */}
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1E1B4B', mb: 2 }}>
            Price Calculation Preview
          </Typography>
          <Box sx={{ mb: 3, p: 2.5, backgroundColor: '#F5F5F5', borderRadius: 2, border: '1px solid #E0E0E0' }}>
            <Grid container spacing={1} sx={{ display: "flex", flexDirection: "column" }}>
              {/* Metal Breakdown */}
              {pricePreview.metalBreakdown.length > 0 ? (
                pricePreview.metalBreakdown.map((m, i) => (
                  <React.Fragment key={i}>
                    <Grid item xs={8}>
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        {m.type} ({m.purity?.replace('_', ' ') || ''}): {m.weight}g × ₹{m.rate.toLocaleString('en-IN')}/g
                      </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">₹{m.value.toLocaleString('en-IN')}</Typography>
                    </Grid>
                  </React.Fragment>
                ))
              ) : (
                <>
                  <Grid item xs={8}>
                    <Typography variant="body2" sx={{ color: '#999' }}>Metal Value</Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ color: '#999' }}>₹0</Typography>
                  </Grid>
                </>
              )}

              {pricePreview.metalBreakdown.length > 1 && (
                <>
                  <Grid item xs={8}>
                    <Typography variant="body2" sx={{ color: '#666', fontWeight: 'bold' }}>
                      Total Metal Value ({pricePreview.totalNetWeight}g)
                    </Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{pricePreview.metalValue.toLocaleString('en-IN')}</Typography>
                  </Grid>
                </>
              )}

              {pricePreview.diamondBreakdown.length > 0 && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />
                  </Grid>
                  {pricePreview.diamondBreakdown.map((d, i) => (
                    <React.Fragment key={i}>
                      <Grid item xs={8}>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          Diamond #{i + 1}: {d.weight}ct × ₹{d.rate.toLocaleString('en-IN')} ({d.clarity}→{d.bucket.split('-')[0]}, {d.color}→{d.bucket.split('-')[1]})
                        </Typography>
                      </Grid>
                      <Grid item xs={4} sx={{ textAlign: 'right' }}>
                        <Typography variant="body2">₹{d.value.toLocaleString('en-IN')}</Typography>
                      </Grid>
                    </React.Fragment>
                  ))}
                  <Grid item xs={8}>
                    <Typography variant="body2" sx={{ color: '#666', fontWeight: 'bold' }}>Diamond Value (Total)</Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{pricePreview.diamondValue.toLocaleString('en-IN')}</Typography>
                  </Grid>
                </>
              )}

              <Grid item xs={8}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Making Charges ({formData.makingChargeType === 'percentage' ? `${formData.makingChargeValue || 0}%` : `₹${formData.makingChargeValue || 0}`})
                </Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="body2">₹{pricePreview.makingChargeAmount.toLocaleString('en-IN')}</Typography>
              </Grid>

              <Grid item xs={8}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Wastage Charges ({formData.wastageChargeType === 'percentage' ? `${formData.wastageChargeValue || 0}%` : `₹${formData.wastageChargeValue || 0}`})
                </Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="body2">₹{pricePreview.wastageChargeAmount.toLocaleString('en-IN')}</Typography>
              </Grid>

              <Grid item xs={8}>
                <Typography variant="body2" sx={{ color: '#666' }}>Stone Setting Charges</Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="body2">₹{pricePreview.stoneSettingCharges.toLocaleString('en-IN')}</Typography>
              </Grid>

              <Grid item xs={8}>
                <Typography variant="body2" sx={{ color: '#666' }}>Design Charges</Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="body2">₹{pricePreview.designCharges.toLocaleString('en-IN')}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 0.5 }} />
              </Grid>

              <Grid item xs={8}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Subtotal</Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{pricePreview.subtotal.toLocaleString('en-IN')}</Typography>
              </Grid>

              {pricePreview.discount > 0 && (
                <>
                  <Grid item xs={8}>
                    <Typography variant="body2" sx={{ color: '#4CAF50' }}>Discount</Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ color: '#4CAF50' }}>-₹{pricePreview.discount.toLocaleString('en-IN')}</Typography>
                  </Grid>
                </>
              )}

              <Grid item xs={8}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  GST on Jewelry @ {pricePreview.jewelryTaxRate}%
                </Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="body2">₹{pricePreview.jewelryTax.toLocaleString('en-IN')}</Typography>
              </Grid>

              <Grid item xs={8}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  GST on Making @ {pricePreview.makingTaxRate}%
                </Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="body2">₹{pricePreview.labourTax.toLocaleString('en-IN')}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 0.5 }} />
              </Grid>

              <Grid item xs={8}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#1E1B4B' }}>
                  Final Price
                </Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#1E1B4B' }}>
                  ₹{pricePreview.finalPrice.toLocaleString('en-IN')}
                </Typography>
              </Grid>
            </Grid>
          </Box>
          <Divider sx={{ mb: 3 }} />

          {/* Section 7: Status */}
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
    </div>
  );
}
