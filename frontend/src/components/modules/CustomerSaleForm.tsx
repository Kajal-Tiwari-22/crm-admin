'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bike, LoaderCircle, X } from 'lucide-react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency } from '@/lib/storage';

const API_BASE = '/api';
const inputClass = 'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100';

type PaymentMethod = 'Full Payment' | 'Finance Company EMI' | 'Showroom Installments';
interface StockModel {
  key: string;
  modelNumber: string;
  companyName: string;
  lightType: string;
  availableQty: number;
  suggestedPrice: number;
}
interface StockUnit {
  id: string;
  brand: string;
  model: string;
  modelNumber?: string;
  color: string;
  lightType?: string;
  companyName?: string;
  chassisVin: string;
  batterySerial: string;
  sellingPrice: number;
  purchasePrice: number;
  inventoryBatchId?: string;
}
interface StockResponse {
  success: boolean;
  message?: string;
  data?: { models: StockModel[]; units: StockUnit[] };
}

async function readApiResponse<T>(response: Response, action: string): Promise<T> {
  const body = await response.text();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    const preview = body.trim().slice(0, 120).replace(/\s+/g, ' ');
    throw new Error(
      `${action} returned a non-JSON response (HTTP ${response.status}). ` +
      `Check that the frontend /api rewrite points to the CRM backend. ` +
      `Response: ${preview || 'empty response'}`
    );
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`${action} returned invalid JSON (HTTP ${response.status}).`);
  }
}

function dateAfterOneMonth() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

function validIndianMobile(phone: string) {
  const digits = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits);
}

function installmentEstimate(balance: number, count: number, annualRate: number) {
  if (!count || balance <= 0) return 0;
  const rate = annualRate / 1200;
  if (!rate) return Math.ceil(balance / count);
  return Math.round(balance * rate * Math.pow(1 + rate, count) / (Math.pow(1 + rate, count) - 1));
}

export default function CustomerSaleForm({ onClose, onSaved }: { onClose: () => void; onSaved: (invoiceNumber: string) => void }) {
  const { currentStaff } = useCRM();
  const [models, setModels] = useState<StockModel[]>([]);
  const [units, setUnits] = useState<StockUnit[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [stockError, setStockError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sameAddress, setSameAddress] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [installmentAmounts, setInstallmentAmounts] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    currentAddress: '',
    permanentAddress: '',
    panNumber: '',
    guarantorRequired: false,
    guarantorName: '',
    guarantorPhone: '',
    guarantorAddress: '',
    modelKey: '',
    vehicleId: '',
    saleDate: new Date().toISOString().slice(0, 10),
    sellingPrice: '',
    discount: '0',
    paymentMethod: 'Full Payment' as PaymentMethod,
    downPayment: '',
    initialPaymentMethod: 'UPI',
    initialPaymentReference: '',
    financeCompanyName: '',
    loanAccountRef: '',
    installmentCount: '12',
    firstDueDate: dateAfterOneMonth(),
    paymentDay: '',
    interestRate: '0',
    financeStatus: 'Pending',
    paymentFrequency: 'Monthly'
  });

  useEffect(() => {
    let active = true;
    setLoadingStock(true);
    fetch(`${API_BASE}/available-scooters`, { credentials: 'include' })
      .then(async response => {
        const json = await readApiResponse<StockResponse>(response, 'Loading inventory');
        if (!response.ok || !json.success || !json.data) {
          throw new Error(json.message || 'Unable to load available scooters.');
        }
        if (active) {
          setModels(json.data.models);
          setUnits(json.data.units);
        }
      })
      .catch(reason => {
        if (active) setStockError(reason instanceof Error ? reason.message : 'Unable to load inventory.');
      })
      .finally(() => {
        if (active) setLoadingStock(false);
      });
    return () => { active = false; };
  }, []);

  const selectedModel = models.find(model => model.key === form.modelKey);
  const modelUnits = units.filter(unit =>
    `${unit.companyName || unit.brand}:${unit.modelNumber || unit.model}` === form.modelKey
  );
  const visibleUnits = selectedModel ? modelUnits : units;
  const filteredModels = models.filter(model =>
    `${model.modelNumber} ${model.companyName} ${model.lightType}`.toLowerCase().includes(modelSearch.toLowerCase())
  );
  const selectedUnit = units.find(unit => unit.id === form.vehicleId);
  const sellingPrice = Number(form.sellingPrice) || 0;
  const discount = Number(form.discount) || 0;
  const finalPrice = Math.max(0, sellingPrice - discount);
  const downPayment = form.paymentMethod === 'Full Payment' ? finalPrice : (Number(form.downPayment) || 0);
  const remainingAmount = Math.max(0, finalPrice - downPayment);
  const count = Math.min(120, Math.max(1, Number(form.installmentCount) || 1));
  const interestRate = Math.max(0, Number(form.interestRate) || 0);
  const estimatedMonthly = installmentEstimate(remainingAmount, count, interestRate);
  const amounts = useMemo(() => Array.from({ length: count }, (_, index) => {
    const specified = Number(installmentAmounts[index]);
    if (Number.isFinite(specified) && specified > 0) return specified;
    return index === count - 1
      ? Math.max(1, remainingAmount - estimatedMonthly * (count - 1))
      : estimatedMonthly;
  }), [count, estimatedMonthly, installmentAmounts, remainingAmount]);

  const update = (key: string, value: string | boolean) => {
    setForm(previous => ({ ...previous, [key]: value }));
    setError('');
  };

  const chooseModel = (key: string) => {
    const model = models.find(entry => entry.key === key);
    const label = model
      ? `${model.modelNumber} · ${model.companyName} · ${model.lightType || 'Light type not set'} · ${model.availableQty} available`
      : '';
    setForm(previous => ({
      ...previous,
      modelKey: model ? key : '',
      vehicleId: '',
      sellingPrice: model?.suggestedPrice ? String(model.suggestedPrice) : '',
      downPayment: previous.paymentMethod === 'Full Payment' ? '' : previous.downPayment
    }));
    setModelSearch(label);
    setIsModelDropdownOpen(false);
    setError('');
    if (!model && key) setStockError('Choose a model from the available inventory list.');
    else setStockError('');
  };

  const onPaymentMethodChange = (paymentMethod: PaymentMethod) => {
    setForm(previous => ({
      ...previous,
      paymentMethod,
      downPayment: paymentMethod === 'Full Payment' ? '' : previous.downPayment,
      financeCompanyName: previous.financeCompanyName
    }));
    setInstallmentAmounts([]);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!validIndianMobile(form.phone)) {
      setError('Enter a valid Indian mobile number.');
      return;
    }
    if (form.guarantorRequired && !validIndianMobile(form.guarantorPhone)) {
      setError('Enter a valid guarantor mobile number.');
      return;
    }
    if (discount < 0 || discount >= sellingPrice || sellingPrice <= 0) {
      setError('Selling price must be positive and discount must be less than the selling price.');
      return;
    }
    if (form.paymentMethod !== 'Full Payment' && (downPayment < 0 || downPayment >= finalPrice)) {
      setError('Down payment must be less than the final selling price.');
      return;
    }
    if (!selectedUnit) {
      setError('Select an available physical scooter unit before confirming the sale.');
      return;
    }
    if (!selectedModel) {
      setError('Choose a scooter model from the available inventory list.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/customer-sales`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: form.name.trim(),
            phone: form.phone,
            email: form.email.trim(),
            currentAddress: form.currentAddress.trim(),
            permanentAddress: sameAddress ? form.currentAddress.trim() : form.permanentAddress.trim(),
            panNumber: form.panNumber.trim().toUpperCase(),
            guarantorRequired: form.guarantorRequired,
            guarantor: form.guarantorRequired ? {
              name: form.guarantorName.trim(),
              phone: form.guarantorPhone,
              address: form.guarantorAddress.trim()
            } : undefined,
            city: '',
            pincode: '',
            aadhaarNumber: '',
            documents: [],
            notes: '',
            vehicleIds: [],
            communicationPreference: 'WhatsApp'
          },
          sale: {
            vehicleId: selectedUnit.id,
            saleDate: form.saleDate,
            sellingPrice,
            discount,
            downPayment,
            paymentMethod: form.paymentMethod,
            initialPaymentMethod: form.initialPaymentMethod,
            initialPaymentReference: form.initialPaymentReference,
            financeCompanyName: form.financeCompanyName,
            loanAccountRef: form.loanAccountRef,
            installmentCount: count,
            installmentAmounts: form.paymentMethod === 'Full Payment' ? [] : amounts,
            firstDueDate: form.firstDueDate,
            paymentDay: form.paymentDay ? Number(form.paymentDay) : null,
            interestRate,
            financeStatus: form.financeStatus,
            paymentFrequency: form.paymentFrequency,
            salespersonName: currentStaff.name
          }
        })
      });
      const result = await readApiResponse<{
        success: boolean;
        message?: string;
        data: { sale: { invoiceNumber: string } };
      }>(response, 'Saving customer sale');
      if (!response.ok || !result.success) {
        if (response.status === 409) {
          setForm(previous => ({ ...previous, vehicleId: '' }));
          const stockResponse = await fetch(`${API_BASE}/available-scooters`, { credentials: 'include' });
          const stockResult = await readApiResponse<StockResponse>(stockResponse, 'Refreshing inventory');
          if (stockResponse.ok && stockResult.success && stockResult.data) {
            setModels(stockResult.data.models);
            setUnits(stockResult.data.units);
          }
        }
        throw new Error(result.message || 'Could not complete this sale.');
      }
      onSaved(result.data.sale.invoiceNumber);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not complete this sale.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
      <div className="mx-auto my-3 w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-6">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Bike className="h-5 w-5 text-blue-600" /> Add Customer & Record Sale
            </h2>
            <p className="mt-1 text-xs text-slate-500">Customer, scooter assignment, invoice and payment plan are saved together.</p>
          </div>
          <button onClick={onClose} aria-label="Close form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:mx-6">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-6 p-4 sm:p-6">
          <section className="space-y-3">
            <SectionTitle title="Customer Details" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Customer Name" required><input required maxLength={120} className={inputClass} value={form.name} onChange={e => update('name', e.target.value)} /></Field>
              <Field label="Phone Number" required><input required inputMode="tel" autoComplete="tel" pattern="(?:\+91[\s-]?)?[6-9][0-9\s-]{9,14}" className={inputClass} value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+91 98765 43210" /></Field>
              <Field label="Email (optional)"><input type="email" className={inputClass} value={form.email} onChange={e => update('email', e.target.value)} /></Field>
              <Field label="Current Address"><textarea rows={2} className={inputClass} value={form.currentAddress} onChange={e => {
                setForm(previous => ({ ...previous, currentAddress: e.target.value, ...(sameAddress ? { permanentAddress: e.target.value } : {}) }));
              }} /></Field>
              <Field label="Permanent Address"><textarea rows={2} className={inputClass} disabled={sameAddress} value={sameAddress ? form.currentAddress : form.permanentAddress} onChange={e => update('permanentAddress', e.target.value)} /></Field>
              <Field label="PAN Card Number (optional)"><input maxLength={10} pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" className={`${inputClass} uppercase`} value={form.panNumber} onChange={e => update('panNumber', e.target.value.toUpperCase())} placeholder="ABCDE1234F" /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={sameAddress} onChange={e => {
                setSameAddress(e.target.checked);
                if (e.target.checked) setForm(previous => ({ ...previous, permanentAddress: previous.currentAddress }));
              }} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
              Permanent address same as current address
            </label>
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-5">
            <SectionTitle title="Guarantor Details" />
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.guarantorRequired} onChange={e => update('guarantorRequired', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
              A guarantor is required for this purchase
            </label>
            {form.guarantorRequired && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Guarantor Name" required><input required className={inputClass} value={form.guarantorName} onChange={e => update('guarantorName', e.target.value)} /></Field>
                <Field label="Guarantor Phone Number" required><input required inputMode="tel" className={inputClass} value={form.guarantorPhone} onChange={e => update('guarantorPhone', e.target.value)} /></Field>
                <Field label="Guarantor Address" required><textarea required rows={2} className={inputClass} value={form.guarantorAddress} onChange={e => update('guarantorAddress', e.target.value)} /></Field>
              </div>
            )}
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-5">
            <SectionTitle title="Scooter Selection" />
            {loadingStock ? (
              <div className="flex items-center gap-2 py-4 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading current inventory…</div>
            ) : stockError ? (
              <p role="alert" className="text-sm text-rose-600">{stockError}</p>
            ) : models.length === 0 ? (
              <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">No stock available</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor="scooter-model-search" className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Select Scooty Model<span className="ml-1 text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="scooter-model-search"
                      required
                      autoComplete="off"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-controls="available-scooter-models"
                      aria-expanded={isModelDropdownOpen}
                      className={`${inputClass} cursor-text`}
                      value={modelSearch}
                      placeholder="Click or type to search available scooter models"
                      onFocus={() => setIsModelDropdownOpen(true)}
                      onBlur={() => setIsModelDropdownOpen(false)}
                      onChange={event => {
                        setModelSearch(event.target.value);
                        setForm(previous => ({ ...previous, modelKey: '', vehicleId: '' }));
                        setStockError('');
                        setIsModelDropdownOpen(true);
                      }}
                    />
                    {isModelDropdownOpen && (
                      <div id="available-scooter-models" role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                        {filteredModels.length ? filteredModels.map(model => (
                          <button
                            key={model.key}
                            type="button"
                            role="option"
                            aria-selected={selectedModel?.key === model.key}
                            onMouseDown={event => event.preventDefault()}
                            onClick={() => chooseModel(model.key)}
                            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                          >
                            <span className="block font-semibold">{model.modelNumber} · {model.companyName}</span>
                            <span className="block text-xs text-slate-500">{model.lightType || 'Light type not set'} · {model.availableQty} available</span>
                          </button>
                        )) : (
                          <p className="px-3 py-2 text-sm text-slate-500">No matching scooter model.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Field label="Select Physical Scooter / Chassis" required>
                  <select
                    required
                    disabled={!visibleUnits.length}
                    className={`${inputClass} cursor-pointer`}
                    value={form.vehicleId}
                    onChange={event => {
                      const unit = visibleUnits.find(entry => entry.id === event.target.value);
                      const model = unit && models.find(entry =>
                        entry.key === `${unit.companyName || unit.brand}:${unit.modelNumber || unit.model}`
                      );
                      if (model) {
                        setForm(previous => ({
                          ...previous,
                          modelKey: model.key,
                          vehicleId: event.target.value,
                          sellingPrice: unit?.sellingPrice ? String(unit.sellingPrice) : previous.sellingPrice
                        }));
                        setModelSearch(`${model.modelNumber} · ${model.companyName} · ${model.lightType || 'Light type not set'} · ${model.availableQty} available`);
                      } else {
                        setForm(previous => ({
                          ...previous,
                          vehicleId: event.target.value,
                          sellingPrice: unit?.sellingPrice ? String(unit.sellingPrice) : previous.sellingPrice
                        }));
                      }
                    }}
                  >
                    <option value="">
                      {visibleUnits.length
                        ? (selectedModel ? 'Select available unit' : 'Select an available scooter')
                        : 'No stock available'}
                    </option>
                    {visibleUnits.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.chassisVin} · Battery {unit.batterySerial || 'not recorded'} · {unit.color || 'Color n/a'}</option>
                    ))}
                  </select>
                </Field>
                {selectedUnit && (
                  <div className="md:col-span-2 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <p>
                      <span className="text-slate-500">Model / Company</span>
                      <strong className="mt-1 block">
                        {selectedModel?.modelNumber || selectedUnit.modelNumber || selectedUnit.model} · {selectedModel?.companyName || selectedUnit.companyName || selectedUnit.brand}
                      </strong>
                    </p>
                    <p><span className="text-slate-500">Chassis Number</span><strong className="mt-1 block break-all font-mono">{selectedUnit.chassisVin}</strong></p>
                    <p><span className="text-slate-500">Battery Serial</span><strong className="mt-1 block break-all font-mono">{selectedUnit.batterySerial || 'Not recorded'}</strong></p>
                    <p><span className="text-slate-500">Suggested Selling Price</span><strong className="mt-1 block">{selectedUnit.sellingPrice ? formatCurrency(selectedUnit.sellingPrice) : 'Not set'}</strong></p>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-5">
            <SectionTitle title="Purchase & Sale Details" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Purchase / Sale Date" required><input type="date" required className={inputClass} value={form.saleDate} onChange={e => update('saleDate', e.target.value)} /></Field>
              <Field label="Selling Price (₹)" required><input type="number" min="1" step="0.01" required className={inputClass} value={form.sellingPrice} onChange={e => update('sellingPrice', e.target.value)} /></Field>
              <Field label="Discount (₹)"><input type="number" min="0" step="0.01" className={inputClass} value={form.discount} onChange={e => update('discount', e.target.value)} /></Field>
              <Field label="Final Selling Price"><output className={`${inputClass} block bg-slate-100 font-bold`}>{formatCurrency(finalPrice)}</output></Field>
              <Field label="Payment Method" required>
                <select className={inputClass} value={form.paymentMethod} onChange={e => onPaymentMethodChange(e.target.value as PaymentMethod)}>
                  <option>Full Payment</option><option>Finance Company EMI</option><option>Showroom Installments</option>
                </select>
              </Field>
              <Field label="Down Payment (₹)" required><input type="number" min="0" max={finalPrice} step="0.01" required disabled={form.paymentMethod === 'Full Payment'} className={inputClass} value={form.paymentMethod === 'Full Payment' ? finalPrice : form.downPayment} onChange={e => update('downPayment', e.target.value)} /></Field>
              <Field label="Remaining Amount"><output className={`${inputClass} block bg-slate-100 font-bold`}>{formatCurrency(remainingAmount)}</output></Field>
              <Field label="Purchase Invoice Number"><output className={`${inputClass} block bg-slate-100 text-slate-500`}>Assigned securely on save</output></Field>
              <Field label="Salesperson / Staff"><output className={`${inputClass} block bg-slate-100`}>{currentStaff.name}</output></Field>
              <Field label="Payment Method for Down Payment">
                <select className={inputClass} value={form.initialPaymentMethod} onChange={e => update('initialPaymentMethod', e.target.value)}>
                  <option>UPI</option><option>Cash</option><option>Bank Transfer</option><option>Cheque</option>
                </select>
              </Field>
              <Field label="Payment Reference (optional)"><input className={inputClass} value={form.initialPaymentReference} onChange={e => update('initialPaymentReference', e.target.value)} /></Field>
            </div>
          </section>

          {form.paymentMethod !== 'Full Payment' && (
            <section className="space-y-3 border-t border-slate-100 pt-5">
              <SectionTitle title={form.paymentMethod === 'Finance Company EMI' ? 'Finance Company EMI' : 'Showroom Installments'} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {form.paymentMethod === 'Finance Company EMI' && (
                  <>
                    <Field label="Finance Company Name" required><input required className={inputClass} value={form.financeCompanyName} onChange={e => update('financeCompanyName', e.target.value)} /></Field>
                    <Field label="Finance Reference / Loan Number"><input className={inputClass} value={form.loanAccountRef} onChange={e => update('loanAccountRef', e.target.value)} /></Field>
                    <Field label="Finance Status">
                      <select className={inputClass} value={form.financeStatus} onChange={e => update('financeStatus', e.target.value)}>
                        <option>Pending</option><option>Approved</option><option>Rejected</option>
                      </select>
                    </Field>
                  </>
                )}
                <Field label="Loan / Outstanding Amount"><output className={`${inputClass} block bg-slate-100 font-bold`}>{formatCurrency(remainingAmount)}</output></Field>
                <Field label="Number of Monthly Installments" required><input required type="number" min="1" max="120" className={inputClass} value={form.installmentCount} onChange={e => {
                  update('installmentCount', e.target.value);
                  setInstallmentAmounts([]);
                }} /></Field>
                <Field label="First Due Date" required><input required type="date" className={inputClass} value={form.firstDueDate} onChange={e => update('firstDueDate', e.target.value)} /></Field>
                <Field label="Payment Day (optional)"><input type="number" min="1" max="31" className={inputClass} value={form.paymentDay} onChange={e => update('paymentDay', e.target.value)} placeholder="1–31" /></Field>
                {form.paymentMethod === 'Finance Company EMI' && (
                  <Field label="Annual Interest Rate (%)"><input type="number" min="0" max="100" step="0.01" className={inputClass} value={form.interestRate} onChange={e => update('interestRate', e.target.value)} /></Field>
                )}
                {form.paymentMethod === 'Showroom Installments' && (
                  <>
                    <Field label="Payment Frequency">
                      <select className={inputClass} value={form.paymentFrequency} onChange={e => update('paymentFrequency', e.target.value)}>
                        <option>Monthly</option><option>Fortnightly</option><option>Weekly</option>
                      </select>
                    </Field>
                    <Field label="Monthly Installment Amount"><input readOnly className={`${inputClass} bg-slate-100`} value={formatCurrency(estimatedMonthly)} /></Field>
                  </>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-800">Agreed installment schedule</h4>
                  <p className="text-xs text-slate-500">Edit individual amounts to match the signed finance terms.</p>
                </div>
                <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {amounts.map((amount, index) => (
                    <label key={index} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs">
                      <span className="w-20 shrink-0 font-semibold text-slate-600">Installment {index + 1}</span>
                      <span className="text-slate-400">₹</span>
                      <input type="number" min="1" step="0.01" required className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5" value={installmentAmounts[index] ?? String(amount)} onChange={e => {
                        const updated = [...amounts].map(value => String(value));
                        updated[index] = e.target.value;
                        setInstallmentAmounts(updated);
                      }} />
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-between rounded-xl bg-violet-50 p-3 text-sm">
                <span className="text-violet-800">Agreed total of scheduled installments</span>
                <strong className="text-violet-900">{formatCurrency(amounts.reduce((sum, amount) => sum + amount, 0))}</strong>
              </div>
            </section>
          )}

          <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-4 pt-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={submitting || loadingStock || models.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {submitting ? 'Saving securely…' : 'Save Customer & Confirm Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">{title}</h3>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 text-xs font-semibold text-slate-700">
      <span className="mb-1.5 block">{label}{required && <span className="ml-1 text-rose-500">*</span>}</span>
      {children}
    </label>
  );
}
