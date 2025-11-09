import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Download, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface ImportExportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

interface ImportResult {
  success: number;
  errors: { row: number; message: string }[];
}

export default function ImportExportModal({ onClose, onImportComplete }: ImportExportModalProps) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      // Récupérer tous les produits avec leurs catégories
      let query = supabase
        .from('products')
        .select('*, category:categories(name)');

      // Si pas super_admin, filtrer par tenant_id
      if (userData?.role !== 'super_admin' && userData?.tenant_id) {
        query = query.eq('tenant_id', userData.tenant_id);
      }

      const { data: products, error } = await query;
      if (error) throw error;

      if (!products || products.length === 0) {
        alert('Aucun produit à exporter');
        return;
      }

      // Créer le CSV
      const headers = [
        'SKU',
        'Nom',
        'Catégorie',
        'Prix de base',
        'Prix de vente',
        'Stock minimum',
        'Description',
        'Actif'
      ];

      const csvRows = [
        headers.join(','),
        ...products.map(p => [
          p.sku || '',
          `"${p.name || ''}"`,
          `"${p.category?.name || ''}"`,
          p.base_price || 0,
          p.selling_price || 0,
          p.min_stock || 0,
          `"${(p.description || '').replace(/"/g, '""')}"`,
          p.is_active ? 'Oui' : 'Non'
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `produits_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`${products.length} produits exportés avec succès !`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('Le fichier est vide ou invalide');
      }

      // Charger toutes les catégories
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name');

      const categoryMap = new Map(
        categories?.map(c => [c.name.toLowerCase(), c.id]) || []
      );

      const errors: { row: number; message: string }[] = [];
      let success = 0;

      // Ignorer la ligne d'en-tête
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = parseCSVLine(line);
        
        if (values.length < 8) {
          errors.push({ row: i + 1, message: 'Nombre de colonnes insuffisant' });
          continue;
        }

        try {
          const [sku, name, categoryName, basePrice, sellingPrice, minStock, description, isActive] = values;

          if (!name || !basePrice) {
            errors.push({ row: i + 1, message: 'Nom et prix de base requis' });
            continue;
          }

          const categoryId = categoryMap.get(categoryName.toLowerCase());

          const productData = {
            sku: sku || `SKU-${Date.now()}-${i}`,
            name,
            category_id: categoryId || null,
            base_price: parseFloat(basePrice) || 0,
            selling_price: parseFloat(sellingPrice) || parseFloat(basePrice) || 0,
            min_stock: parseInt(minStock) || 0,
            description: description || '',
            is_active: isActive.toLowerCase() === 'oui' || isActive.toLowerCase() === 'yes',
            tenant_id: userData?.tenant_id || null,
          };

          const { error } = await supabase
            .from('products')
            .insert([productData]);

          if (error) {
            errors.push({ row: i + 1, message: error.message });
          } else {
            success++;
          }
        } catch (error: any) {
          errors.push({ row: i + 1, message: error.message || 'Erreur inconnue' });
        }
      }

      setImportResult({ success, errors });
      if (success > 0) {
        onImportComplete();
      }
    } catch (error: any) {
      console.error('Import error:', error);
      alert(`Erreur lors de l'import: ${error.message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  function downloadTemplate() {
    const headers = [
      'SKU',
      'Nom',
      'Catégorie',
      'Prix de base',
      'Prix de vente',
      'Stock minimum',
      'Description',
      'Actif'
    ];

    const example = [
      'IPHONE14',
      'iPhone 14 Pro Max 256GB',
      'SMARTPHONES',
      '750000',
      '850000',
      '5',
      'Dernier modèle Apple avec écran 6.7 pouces',
      'Oui'
    ];

    const csvContent = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_import_produits.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold text-gray-900">Import/Export de Produits</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Export Section */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-start gap-4">
              <Download className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">Exporter les produits</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Téléchargez tous vos produits au format CSV pour les modifier dans Excel.
                </p>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {exporting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Export en cours...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Exporter en CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Template Section */}
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-start gap-4">
              <FileSpreadsheet className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">Télécharger le modèle</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Téléchargez un fichier modèle avec un exemple pour vous guider lors de l'import.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Télécharger le modèle
                </button>
              </div>
            </div>
          </div>

          {/* Import Section */}
          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <div className="flex items-start gap-4">
              <Upload className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">Importer des produits</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Importez plusieurs produits à la fois depuis un fichier CSV. Le fichier doit suivre le format du modèle.
                </p>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-4 border-2 border-dashed border-gray-300">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleImport}
                      disabled={importing}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className={`flex items-center justify-center gap-2 cursor-pointer ${
                        importing ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {importing ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin text-purple-600" />
                          <span className="text-purple-600 font-medium">Import en cours...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-purple-600" />
                          <span className="text-purple-600 font-medium">Cliquez pour sélectionner un fichier CSV</span>
                        </>
                      )}
                    </label>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>Format attendu :</strong> SKU, Nom, Catégorie, Prix de base, Prix de vente, Stock minimum, Description, Actif</p>
                    <p><strong>Encodage :</strong> UTF-8</p>
                    <p><strong>Séparateur :</strong> Virgule (,)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                {importResult.success > 0 && importResult.errors.length === 0 ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Import réussi !
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    Import terminé avec des erreurs
                  </>
                )}
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-sm font-medium text-gray-700">Produits importés</span>
                  <span className="text-lg font-bold text-green-600">{importResult.success}</span>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Erreurs</span>
                      <span className="text-lg font-bold text-red-600">{importResult.errors.length}</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-xs text-red-700 bg-white p-2 rounded">
                          <strong>Ligne {error.row}:</strong> {error.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
