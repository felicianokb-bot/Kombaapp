
import React, { useState, useEffect } from 'react';
import { Search, Filter, Star, MapPin, BadgeCheck, Phone, Heart } from 'lucide-react';
import { MOCK_SERVICES, TEXT } from '../constants';
import { Language, ServiceProvider } from '../types';
import getSupabase from '../services/supabaseClient'

interface ServiceMarketplaceProps {
  lang: Language;
  onChat: (userId: string, userName: string, context: string) => void;
}

const ServiceMarketplace: React.FC<ServiceMarketplaceProps> = ({ lang, onChat }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [services, setServices] = useState<ServiceProvider[]>([])
  const [sortBy, setSortBy] = useState<'rating' | 'base_price' | 'business_name' | 'created_at'>('rating')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState<boolean>(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{ businessName: string; category: ServiceProvider['category']; description: string; basePrice: string; priceUnit: string; location: string; coverImage: string; available: boolean }>({ businessName: '', category: 'driver', description: '', basePrice: '', priceUnit: 'serviço', location: '', coverImage: '', available: true })
  const t = TEXT[lang];

  useEffect(() => {
    (async () => {
      const supabase = getSupabase()
      if (!supabase) { setUserId(null); return }
      try {
        const res = await supabase.auth.getUser()
        const u = res?.data?.user
        if (u) setUserId(u.id)
      } catch (_e) {
        setUserId(null)
      }
    })();
    (async () => {
      const supabase = getSupabase()
      if (!supabase) { setServices([]); return }
      let q = supabase.from('services').select('*')
      if (selectedCategory !== 'all') q = q.eq('category', selectedCategory)
      if (onlyAvailable) q = q.eq('available', true)
      const term = searchTerm.trim()
      if (term) q = q.or(`business_name.ilike.%${term}%,description.ilike.%${term}%`)
      q = q.order(sortBy, { ascending: sortDir === 'asc' })
      const { data, error } = await q
      if (error || !data) { setServices([]); return }
      const mapped: ServiceProvider[] = (data as any[]).map(r => ({
        id: String(r.id),
        userId: r.user_id,
        businessName: r.business_name,
        category: r.category,
        description: r.description || '',
        rating: Number(r.rating || 0),
        location: r.location || '',
        basePrice: Number(r.base_price || 0),
        priceUnit: r.price_unit || 'serviço',
        coverImage: r.cover_image || 'https://picsum.photos/200/200',
        available: r.available ?? true,
        tags: [],
        distance: r.distance || ''
      }))
      setServices(mapped)
    })()
  }, [lang, selectedCategory, onlyAvailable, searchTerm, sortBy, sortDir])

  const resetForm = () => {
    setEditingId(null)
    setForm({ businessName: '', category: 'driver', description: '', basePrice: '', priceUnit: 'serviço', location: '', coverImage: '', available: true })
  }

  const submitService = async () => {
    const supabase = getSupabase()
    if (!supabase || !userId) return
    const payload = {
      business_name: form.businessName,
      category: form.category,
      description: form.description,
      base_price: Number(form.basePrice || 0),
      price_unit: form.priceUnit,
      location: form.location,
      cover_image: form.coverImage,
      available: form.available,
      user_id: userId
    }
    if (editingId) {
      await supabase.from('services').update(payload).eq('id', editingId)
    } else {
      await supabase.from('services').insert(payload)
    }
    resetForm()
    setShowForm(false)
    const { data } = await supabase.from('services').select('*').order(sortBy, { ascending: sortDir === 'asc' })
    const mapped: ServiceProvider[] = (data as any[]).map(r => ({
      id: String(r.id), userId: r.user_id, businessName: r.business_name, category: r.category, description: r.description || '', rating: Number(r.rating || 0), location: r.location || '', basePrice: Number(r.base_price || 0), priceUnit: r.price_unit || 'serviço', coverImage: r.cover_image || 'https://picsum.photos/200/200', available: r.available ?? true, tags: [], distance: r.distance || ''
    }))
    setServices(mapped)
  }

  const source = services && services.length ? services : MOCK_SERVICES
  const filteredServices = source.filter(s => {
    const matchesSearch = s.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', label: t.categories.all },
    { id: 'driver', label: t.categories.driver },
    { id: 'tech', label: t.categories.tech },
    { id: 'beauty', label: t.categories.beauty },
    { id: 'delivery', label: t.categories.delivery },
    { id: 'education', label: t.categories.education },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 md:p-6 transition-colors duration-200">
      {/* Header & Search */}
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 md:rounded-2xl md:shadow-sm md:border md:border-gray-200 dark:md:border-gray-700 sticky top-0 md:static z-10 mb-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
           <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{t.servicesNearby}</h2>
           
           <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-600 text-gray-800 dark:text-gray-200 transition-all"
                />
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300">
                <option value="rating">Rating</option>
                <option value="base_price">Preço</option>
                <option value="business_name">Nome</option>
                <option value="created_at">Recentes</option>
              </select>
              <select value={sortDir} onChange={(e) => setSortDir(e.target.value as any)} className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300">
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
              <button onClick={() => setOnlyAvailable(v => !v)} className={`p-2.5 rounded-xl font-bold text-xs ${onlyAvailable ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                Disponível
              </button>
              {userId && (
                <button onClick={() => { resetForm(); setShowForm(true) }} className="p-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs">
                  Novo Serviço
                </button>
              )}
           </div>
        </div>
        
        {/* Categories Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <Chip 
              key={cat.id} 
              label={cat.label} 
              active={selectedCategory === cat.id} 
              onClick={() => setSelectedCategory(cat.id)}
            />
          ))}
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 md:rounded-2xl md:shadow-sm md:border md:border-gray-200 dark:md:border-gray-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Nome do negócio" className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })} className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
              <option value="driver">Motorista</option>
              <option value="delivery">Entregas</option>
              <option value="barber">Barbearia</option>
              <option value="tech">Técnico</option>
              <option value="beauty">Beleza</option>
              <option value="education">Aulas</option>
              <option value="events">Eventos</option>
              <option value="other">Outro</option>
            </select>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Localização" className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200" />
            <input value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} type="number" placeholder="Preço base" className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200" />
            <input value={form.priceUnit} onChange={(e) => setForm({ ...form, priceUnit: e.target.value })} placeholder="Unidade de preço" className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200" />
            <input value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} placeholder="URL da imagem" className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Descrição" className="md:col-span-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200" />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} /> Disponível
            </label>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={submitService} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-sm">Guardar</button>
            <button onClick={() => { setShowForm(false); resetForm() }} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold px-4 py-2 rounded-xl text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="p-4 md:p-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-20 md:pb-0">
        {filteredServices.map((service) => (
          <div key={service.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:translate-y-[-2px] transition-all group flex flex-col relative overflow-hidden">
             
             {/* Verification Badge if rating > 4.8 */}
             {service.rating >= 4.9 && (
               <div className="absolute top-0 right-0 bg-yellow-400 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-20 shadow-sm flex items-center gap-1">
                 <BadgeCheck size={12} fill="currentColor" className="text-white" /> PRO
               </div>
             )}

            <div className="relative mb-3">
               <img src={service.coverImage} alt={service.businessName} className="w-full h-40 object-cover rounded-xl bg-gray-200 dark:bg-gray-700" />
               <div className="absolute bottom-2 left-2 bg-white/95 dark:bg-gray-800/95 px-2 py-1 rounded-lg text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center shadow-sm backdrop-blur-sm">
                  <MapPin size={10} className="mr-1 text-blue-500" />
                  {service.distance}
               </div>
               {!service.available && (
                 <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full border border-red-200">Indisponível</span>
                 </div>
               )}
            </div>
            
            <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-800 dark:text-white text-lg leading-tight line-clamp-1">{service.businessName}</h3>
                  <div className="flex items-center text-xs font-bold text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-100 dark:border-yellow-800 px-1.5 py-0.5 rounded-md shrink-0 ml-2">
                    <Star size={10} className="mr-1 fill-yellow-400 text-yellow-400" />
                    {service.rating}
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2 line-clamp-2 min-h-[40px]">{service.description}</p>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {service.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-md">{tag}</span>
                  ))}
                </div>

                <div className="mt-auto pt-3 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">A partir de</span>
                    <span className="font-bold text-gray-900 dark:text-white text-base">Kz {service.basePrice.toLocaleString()} <span className="text-xs text-gray-400 font-normal">/ {service.priceUnit}</span></span>
                  </div>
                  <button 
                    onClick={() => onChat(service.userId, service.businessName, `Olá, gostaria de solicitar o serviço: ${service.businessName}.`)}
                    className="bg-gray-900 dark:bg-blue-600 text-white text-xs px-4 py-2.5 rounded-xl font-bold hover:bg-black dark:hover:bg-blue-700 transition-colors shadow-lg shadow-gray-200 dark:shadow-none"
                  >
                    {lang === 'pt' ? 'Solicitar' : 'Request'}
                  </button>
                  {userId && service.userId === userId && (
                    <button onClick={() => { setEditingId(service.id); setForm({ businessName: service.businessName, category: service.category, description: service.description || '', basePrice: String(service.basePrice || ''), priceUnit: service.priceUnit, location: service.location, coverImage: service.coverImage, available: service.available }); setShowForm(true) }} className="ml-2 bg-yellow-500 text-white text-xs px-3 py-2 rounded-xl font-bold">Editar</button>
                  )}
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Chip: React.FC<{ label: string; active?: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border ${active ? 'bg-gray-900 dark:bg-blue-600 text-white border-gray-900 dark:border-blue-600 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
  >
    {label}
  </button>
);

export default ServiceMarketplace;
