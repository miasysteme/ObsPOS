import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, Edit, Trash2, Tag } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface CategoryModalProps {
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}

export default function CategoryModal({ categories, onClose, onSave }: CategoryModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      const categoryData = {
        ...formData,
        tenant_id: userData?.tenant_id,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert([categoryData]);
        if (error) throw error;
      }

      setFormData({ name: '', description: '' });
      setShowAddForm(false);
      setEditingCategory(null);
      onSave();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Erreur lors de l\'enregistrement de la catégorie');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      onSave();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Erreur lors de la suppression de la catégorie');
    }
  }

  function startEdit(category: Category) {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setShowAddForm(true);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Gérer les Catégories</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add/Edit Form */}
          {showAddForm ? (
            <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h4 className="font-medium text-gray-900">
                {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                <input type="text" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Smartphones" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Description de la catégorie..." />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => {
                  setShowAddForm(false);
                  setEditingCategory(null);
                  setFormData({ name: '', description: '' });
                }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />
              Ajouter une catégorie
            </button>
          )}

          {/* Categories List */}
          <div className="space-y-2">
            {categories.length === 0 ? (
              <div className="text-center py-8">
                <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucune catégorie</p>
              </div>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{category.name}</h4>
                    {category.description && (
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(category)}
                      className="text-primary hover:text-primary-dark p-2" title="Modifier">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-900 p-2" title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4">
          <button onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
