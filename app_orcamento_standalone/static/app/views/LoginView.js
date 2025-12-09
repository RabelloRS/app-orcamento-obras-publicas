import api from '../../js/api.js';

export default {
    template: `
        <div class="flex items-center justify-center h-full bg-gray-50">
            <div class="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
                <div class="text-center">
                    <img src="/static/img/logo.png" alt="Resolve Engenharia" class="h-24 w-auto mx-auto mb-4">
                    <h1 class="text-2xl font-bold text-gray-900">Resolve Engenharia</h1>
                    <p class="text-sm text-gray-600">Faça login para continuar</p>
                </div>

                <form @submit.prevent="login" class="space-y-4">
                    <div>
                        <label for="username" class="block text-sm font-medium text-gray-700">Email</label>
                        <input v-model="username" id="username" type="email" required class="w-full px-3 py-2 mt-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700">Senha</label>
                        <div class="relative mt-1">
                            <input v-model="password" id="password" :type="showPassword ? 'text' : 'password'" required class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10">
                            <button type="button" @click="showPassword = !showPassword" class="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none">
                                <span v-if="showPassword">🙈</span>
                                <span v-else>👁️</span>
                            </button>
                        </div>
                    </div>

                    <div class="flex items-center justify-between text-sm">
                        <router-link to="/forgot-password" class="text-blue-600 hover:text-blue-800">Esqueci a senha</router-link>
                    </div>

                    <div v-if="error" class="text-sm text-red-600 bg-red-100 p-2 rounded">
                        {{ error }}
                    </div>

                    <button type="submit" :disabled="loading" class="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                        {{ loading ? 'Entrando...' : 'Entrar' }}
                    </button>

                     <div class="text-center text-sm">
                        Não tem conta? <router-link to="/register" class="text-blue-600 hover:text-blue-800 font-medium">Cadastre sua empresa</router-link>
                    </div>
                </form>
            </div>
        </div>
    `,
    data() {
        return {
            username: '',
            password: '',
            showPassword: false,
            error: null,
            loading: false
        }
    },
    methods: {
        async login() {
            this.loading = true;
            this.error = null;
            const params = new URLSearchParams();
            params.append('username', this.username);
            params.append('password', this.password);

            try {
                const response = await api.post('/auth/token', params, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                const { access_token } = response.data;
                // Parse JWT to get Role (Simple decode, ideally use a library but simple base64 works for now to just store it)
                const payload = JSON.parse(atob(access_token.split('.')[1]));

                localStorage.setItem('resolve_auth_token', access_token);
                localStorage.setItem('resolve_user_email', this.username);
                localStorage.setItem('resolve_user_role', payload.role);

                // Redirect to dashboard
                this.$router.push('/');
            } catch (err) {
                console.error(err);
                this.error = err.response?.data?.detail || 'Falha no login. Verifique suas credenciais.';
            } finally {
                this.loading = false;
            }
        }
    }
}
