<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getRestaurants, getSuperAdminStats, createRestaurant, updateRestaurant } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import Navbar from '@/components/Navbar.vue';

const router = useRouter();
const authStore = useAuthStore();

const stats = ref({
  activeRestaurants: 0,
  totalOrders: 0,
  totalVolumeFCFA: 0,
  totalProducts: 0
});

const restaurants = ref([]);
const isLoading = ref(true);
const showModal = ref(false);
const isSubmitting = ref(false);

const newResto = ref({
  name: '',
  slug: '',
  phone: '',
  address: '',
  city: 'Ouagadougou',
  typeCompteOM: 'MARCHAND',
  codeMarchandOM: '',
  numeroOM: '',
  orangeMerchant: '',
  moovMerchant: '',
  waveMerchant: '',
  plan: 'pro',
  statut: 'ACTIF'
});

const loadData = async () => {
  isLoading.value = true;
  try {
    const [statsData, restosData] = await Promise.all([
      getSuperAdminStats(),
      getRestaurants()
    ]);
    stats.value = statsData || {};
    restaurants.value = restosData || [];
  } catch (err) {
    console.error('Erreur chargement données SuperAdmin:', err);
    if (err.message && err.message.includes('401')) {
      router.push('/restaurant/login');
    }
  } finally {
    isLoading.value = false;
  }
};

const handleNameChange = () => {
  if (!newResto.value.slug || newResto.value.slug === '') {
    newResto.value.slug = newResto.value.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
};

const handleCreateRestaurant = async () => {
  if (!newResto.value.name) {
    alert('Le nom du restaurant est obligatoire');
    return;
  }
  isSubmitting.value = true;
  try {
    const typeCompte = newResto.value.typeCompteOM || 'CLASSIQUE';
    const codeMarchand = newResto.value.codeMarchandOM || newResto.value.orangeMerchant || '654321';
    const numOM = newResto.value.numeroOM || newResto.value.phone || '70000000';

    await createRestaurant({
      ...newResto.value,
      type_compte_om: typeCompte,
      code_marchand_om: codeMarchand,
      numero_om: numOM,
      orange_merchant: codeMarchand,
      moov_merchant: newResto.value.moovMerchant || '54321',
      wave_merchant: newResto.value.waveMerchant || newResto.value.slug,
      wave_url: `https://pay.wave.com/m/${newResto.value.waveMerchant || newResto.value.slug}`
    });
    alert(`Restaurant "${newResto.value.name}" onboardé avec succès !`);
    showModal.value = false;
    newResto.value = {
      name: '',
      slug: '',
      phone: '',
      address: '',
      city: 'Ouagadougou',
      typeCompteOM: 'MARCHAND',
      codeMarchandOM: '',
      numeroOM: '',
      orangeMerchant: '',
      moovMerchant: '',
      waveMerchant: '',
      plan: 'pro',
      statut: 'ACTIF'
    };
    await loadData();
  } catch (err) {
    alert('Erreur lors de la création : ' + err.message);
  } finally {
    isSubmitting.value = false;
  }
};

const toggleRestaurantStatus = async (resto) => {
  const newStatus = resto.statut === 'ACTIF' ? 'SUSPENDU' : 'ACTIF';
  if (!confirm(`Voulez-vous passer le restaurant "${resto.name}" en statut ${newStatus} ?`)) return;

  try {
    await updateRestaurant(resto.id, { statut: newStatus });
    await loadData();
  } catch (err) {
    alert('Erreur modification : ' + err.message);
  }
};

const formatCurrency = (val) => {
  return new Intl.NumberFormat('fr-FR').format(val || 0) + ' FCFA';
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="superadmin-page">
    <Navbar />

    <main class="superadmin-container">
      <header class="superadmin-header">
        <div>
          <h1>🏢 SuperAdmin SaaS</h1>
          <p class="subtitle">Gestion centralisée des établissements et des flux financiers multi-tenants</p>
        </div>
        <button @click="showModal = true" class="btn-primary">
          + Onboarder un Restaurant
        </button>
      </header>

      <!-- KPI Plateforme SaaS -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Restaurants Actifs</span>
          <span class="kpi-value">{{ stats.activeRestaurants }}</span>
          <span class="kpi-sub">Établissements opérationnels</span>
        </div>

        <div class="kpi-card highlight">
          <span class="kpi-label">Volume d'Affaires SaaS</span>
          <span class="kpi-value">{{ formatCurrency(stats.totalVolumeFCFA) }}</span>
          <span class="kpi-sub">Encaissements Mobile Money validés</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Commandes Totales</span>
          <span class="kpi-value">{{ stats.totalOrders }}</span>
          <span class="kpi-sub">Traitées sur la plateforme</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-label">Plats & Boissons au Catalogue</span>
          <span class="kpi-value">{{ stats.totalProducts }}</span>
          <span class="kpi-sub">Référencés dans les menus</span>
        </div>
      </section>

      <!-- Liste des Établissements Abonnés -->
      <section class="table-section">
        <div class="section-title-bar">
          <h2>Restaurants Partenaires</h2>
          <span class="count-badge">{{ restaurants.length }} inscrits</span>
        </div>

        <div v-if="isLoading" class="loading-state">
          <p>Chargement des restaurants...</p>
        </div>

        <div v-else class="table-responsive">
          <table class="saas-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Slug URL</th>
                <th>Ville / Contact</th>
                <th>Marchands Mobile Money</th>
                <th>Plan</th>
                <th>Statut</th>
                <th>Volume Ventes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="resto in restaurants" :key="resto.id">
                <td class="col-name">
                  <strong>{{ resto.name }}</strong>
                  <span class="resto-id">ID: {{ resto.id }}</span>
                </td>
                <td>
                  <code class="slug-tag">/r/{{ resto.slug }}</code>
                </td>
                <td>
                  <div>{{ resto.city || 'Ouagadougou' }}</div>
                  <small class="text-muted">{{ resto.phone || 'Non renseigné' }}</small>
                </td>
                <td class="col-merchants">
                  <span class="merchant-badge orange">
                    🟠 {{ (resto.type_compte_om || 'CLASSIQUE') === 'MARCHAND' ? `Marchand (${resto.code_marchand_om || resto.orange_merchant || '654321'})` : `P2P (${resto.numero_om || resto.phone || '70000000'})` }}
                  </span>
                  <span class="merchant-badge moov">🔵 {{ resto.moov_merchant || '54321' }}</span>
                  <span class="merchant-badge wave">🌊 {{ resto.wave_merchant || resto.slug }}</span>
                </td>
                <td>
                  <span class="plan-tag" :class="resto.plan">{{ resto.plan || 'pro' }}</span>
                </td>
                <td>
                  <span class="status-tag" :class="resto.statut.toLowerCase()">
                    {{ resto.statut }}
                  </span>
                </td>
                <td class="col-volume">
                  <strong>{{ formatCurrency(resto.totalVolume) }}</strong>
                  <small>{{ resto.orderCount || 0 }} commande(s)</small>
                </td>
                <td>
                  <button 
                    @click="toggleRestaurantStatus(resto)" 
                    class="btn-sm"
                    :class="resto.statut === 'ACTIF' ? 'btn-warn' : 'btn-success'"
                  >
                    {{ resto.statut === 'ACTIF' ? 'Suspendre' : 'Activer' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <!-- Modal d'onboarding restaurant -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Onboarder un Nouveau Restaurant</h3>
          <button @click="showModal = false" class="btn-close">✕</button>
        </div>

        <form @submit.prevent="handleCreateRestaurant" class="modal-form">
          <div class="form-row">
            <div class="form-group">
              <label>Nom du Restaurant *</label>
              <input 
                v-model="newResto.name" 
                @input="handleNameChange" 
                type="text" 
                placeholder="Ex: Le Braisé Gourmet" 
                required 
              />
            </div>

            <div class="form-group">
              <label>Slug URL (identifiant web)</label>
              <input 
                v-model="newResto.slug" 
                type="text" 
                placeholder="ex: le-braise" 
                required 
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Téléphone Contact</label>
              <input v-model="newResto.phone" type="text" placeholder="+226 70 00 00 00" />
            </div>

            <div class="form-group">
              <label>Ville</label>
              <input v-model="newResto.city" type="text" placeholder="Ouagadougou" />
            </div>
          </div>

          <div class="form-group">
            <label>Adresse physique</label>
            <input v-model="newResto.address" type="text" placeholder="Ex: Zone du Bois, Avenue..." />
          </div>

          <fieldset class="merchant-fieldset">
            <legend>💳 Comptes Marchands Mobile Money</legend>
            <div class="form-row">
              <div class="form-group">
                <label>🟠 Type Compte Orange Money</label>
                <select v-model="newResto.typeCompteOM">
                  <option value="MARCHAND">Compte Marchand (*144*4*6*code*montant*ref#)</option>
                  <option value="CLASSIQUE">Classique P2P (*144*2*1*num*montant#)</option>
                </select>
              </div>

              <div v-if="newResto.typeCompteOM === 'MARCHAND'" class="form-group">
                <label>🟠 Code Marchand Orange Money</label>
                <input v-model="newResto.codeMarchandOM" type="text" placeholder="Ex: 654321" />
              </div>

              <div v-else class="form-group">
                <label>🟠 Numéro Téléphone Caissier (P2P)</label>
                <input v-model="newResto.numeroOM" type="text" placeholder="Ex: 70000000" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>🔵 Code Marchand Moov Money</label>
                <input v-model="newResto.moovMerchant" type="text" placeholder="Ex: 99887" />
              </div>

              <div class="form-group">
                <label>🌊 Identifiant Marchand Wave</label>
                <input v-model="newResto.waveMerchant" type="text" placeholder="Ex: nom-du-resto" />
              </div>
            </div>
          </fieldset>

          <div class="form-row">
            <div class="form-group">
              <label>Formule d'Abonnement</label>
              <select v-model="newResto.plan">
                <option value="starter">Starter (1 caisse)</option>
                <option value="pro">Pro (Caisse + KDS Cuisine)</option>
                <option value="enterprise">Entreprise (Multi-salles & API)</option>
              </select>
            </div>

            <div class="form-group">
              <label>Statut</label>
              <select v-model="newResto.statut">
                <option value="ACTIF">ACTIF</option>
                <option value="ESSAI">PÉRIODE D'ESSAI</option>
                <option value="SUSPENDU">SUSPENDU</option>
              </select>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" @click="showModal = false" class="btn-cancel">Annuler</button>
            <button type="submit" class="btn-primary" :disabled="isSubmitting">
              {{ isSubmitting ? 'Création en cours...' : 'Créer le restaurant' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.superadmin-page {
  min-height: 100vh;
  background-color: #0f0f0f;
  color: #fff;
}

.superadmin-container {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1.5rem;
}

.superadmin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.superadmin-header h1 {
  font-family: 'Playfair Display', serif;
  font-size: 2.2rem;
  color: #d4af37;
  margin: 0 0 0.4rem 0;
}

.subtitle {
  color: #888;
  font-size: 0.95rem;
  margin: 0;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.2rem;
  margin-bottom: 2.5rem;
}

.kpi-card {
  background-color: #161616;
  border: 1px solid #282828;
  border-radius: 10px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.kpi-card.highlight {
  border-color: rgba(212, 175, 55, 0.4);
  background: linear-gradient(145deg, #181818, #221d10);
}

.kpi-label {
  font-size: 0.85rem;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kpi-value {
  font-size: 2rem;
  font-weight: 700;
  color: #d4af37;
}

.kpi-sub {
  font-size: 0.8rem;
  color: #666;
}

.table-section {
  background-color: #161616;
  border: 1px solid #282828;
  border-radius: 10px;
  padding: 1.8rem;
}

.section-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-title-bar h2 {
  font-size: 1.4rem;
  color: #fff;
  margin: 0;
}

.count-badge {
  background: #252525;
  color: #ccc;
  font-size: 0.8rem;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
}

.table-responsive {
  overflow-x: auto;
}

.saas-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
}

.saas-table th {
  background-color: #1f1f1f;
  color: #888;
  font-weight: 600;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid #333;
}

.saas-table td {
  padding: 1rem;
  border-bottom: 1px solid #222;
  vertical-align: middle;
}

.col-name strong {
  display: block;
  font-size: 1rem;
  color: #fff;
}

.resto-id {
  font-size: 0.75rem;
  color: #666;
}

.slug-tag {
  background: #111;
  border: 1px solid #333;
  color: #d4af37;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.col-merchants {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.merchant-badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  display: inline-block;
}

.merchant-badge.orange { background: rgba(255, 121, 0, 0.15); color: #ff7900; }
.merchant-badge.moov { background: rgba(0, 102, 179, 0.15); color: #4da6ff; }
.merchant-badge.wave { background: rgba(0, 153, 204, 0.15); color: #33ccff; }

.plan-tag {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}
.plan-tag.enterprise { background: #5c2d91; color: #fff; }
.plan-tag.pro { background: #d4af37; color: #000; }
.plan-tag.starter { background: #333; color: #ccc; }

.status-tag {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
}
.status-tag.actif { background: rgba(46, 204, 113, 0.15); color: #2ecc71; }
.status-tag.suspendu { background: rgba(231, 76, 60, 0.15); color: #e74c3c; }
.status-tag.essai { background: rgba(243, 156, 18, 0.15); color: #f39c12; }

.col-volume strong {
  display: block;
  color: #2ecc71;
}

.col-volume small {
  color: #777;
}

.btn-primary {
  background-color: #d4af37;
  color: #000;
  border: none;
  font-weight: 700;
  padding: 0.75rem 1.4rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background-color: #e5c158;
}

.btn-sm {
  padding: 0.35rem 0.8rem;
  border-radius: 4px;
  border: none;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-warn { background: rgba(231, 76, 60, 0.2); color: #ff6b6b; }
.btn-warn:hover { background: rgba(231, 76, 60, 0.4); }
.btn-success { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
.btn-success:hover { background: rgba(46, 204, 113, 0.4); }

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 1rem;
}

.modal-card {
  background: #181818;
  border: 1px solid #333;
  border-radius: 12px;
  width: 100%;
  max-width: 650px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h3 {
  font-size: 1.3rem;
  color: #d4af37;
  margin: 0;
}

.btn-close {
  background: transparent;
  border: none;
  color: #aaa;
  font-size: 1.2rem;
  cursor: pointer;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.82rem;
  color: #aaa;
}

.form-group input, .form-group select {
  background: #111;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 0.65rem 0.8rem;
  color: #fff;
  font-size: 0.9rem;
}

.form-group input:focus, .form-group select:focus {
  border-color: #d4af37;
  outline: none;
}

.merchant-fieldset {
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.merchant-fieldset legend {
  color: #d4af37;
  font-size: 0.9rem;
  padding: 0 0.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-cancel {
  background: transparent;
  border: 1px solid #444;
  color: #ccc;
  padding: 0.75rem 1.4rem;
  border-radius: 6px;
  cursor: pointer;
}
</style>
