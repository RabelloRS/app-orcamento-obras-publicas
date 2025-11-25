from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods

from .forms import RegistrationForm
from .models import EmailDomainGroup, UserAccessProfile


# Manual/Help content for each tool
MANUAL_CONTENT = {
    'microdrenagem': {
        'title': 'Microdrenagem Urbana',
        'icon': 'bi-bezier',
        'description': 'Ferramenta para dimensionamento de galerias pluviais e redes de microdrenagem urbana.',
        'developer': 'Rodrigo Emanuel Rabello',
        'developer_title': 'Engenheiro Civil',
        'developer_location': 'Nova Petrópolis, RS - Brasil',
        'theory': '''
            <h5>Fundamentação Teórica</h5>
            <p>A microdrenagem urbana é responsável pela coleta e condução das águas pluviais em áreas urbanas, 
            utilizando sarjetas, bocas de lobo, poços de visita e galerias. O dimensionamento segue as normas 
            técnicas brasileiras e metodologias consagradas na engenharia hidráulica.</p>
            
            <h6>Método Racional</h6>
            <p>A ferramenta utiliza o Método Racional para determinação da vazão de projeto:</p>
            <p class="text-center"><strong>Q = C × i × A</strong></p>
            <ul>
                <li><strong>Q</strong> = Vazão de pico (L/s ou m³/s)</li>
                <li><strong>C</strong> = Coeficiente de escoamento superficial (runoff)</li>
                <li><strong>i</strong> = Intensidade da chuva (mm/h)</li>
                <li><strong>A</strong> = Área de contribuição (ha ou km²)</li>
            </ul>
            
            <h6>Equações IDF (Intensidade-Duração-Frequência)</h6>
            <p>A intensidade da chuva é calculada através de equações IDF locais, geralmente no formato:</p>
            <p class="text-center"><strong>i = (K × TR<sup>a</sup>) / (t + b)<sup>c</sup></strong></p>
            <p>Onde K, a, b e c são parâmetros ajustados para cada localidade.</p>
            
            <h6>Dimensionamento Hidráulico</h6>
            <p>O dimensionamento das galerias utiliza a equação de Manning para escoamento em condutos:</p>
            <p class="text-center"><strong>Q = (A × R<sup>2/3</sup> × S<sup>1/2</sup>) / n</strong></p>
            <ul>
                <li><strong>A</strong> = Área molhada da seção</li>
                <li><strong>R</strong> = Raio hidráulico</li>
                <li><strong>S</strong> = Declividade do conduto</li>
                <li><strong>n</strong> = Coeficiente de rugosidade de Manning</li>
            </ul>
        ''',
        'how_it_works': '''
            <h5>Como Utilizar</h5>
            <ol>
                <li><strong>Parâmetros Globais:</strong> Configure a região/cidade para obter a equação IDF correspondente, 
                defina o tempo de recorrência (TR) e o tempo de concentração inicial.</li>
                <li><strong>Material e Coeficiente:</strong> Selecione o material da tubulação (concreto, PVC, etc.) 
                e defina o coeficiente de runoff para a área.</li>
                <li><strong>Adicionar Trechos:</strong> Para cada trecho da rede:
                    <ul>
                        <li>Informe os PVs de montante e jusante</li>
                        <li>Digite o comprimento do trecho</li>
                        <li>Insira as cotas de tampa e fundo dos PVs</li>
                        <li>Defina a área de contribuição própria</li>
                    </ul>
                </li>
                <li><strong>Calcular:</strong> O sistema calculará automaticamente a vazão, diâmetro necessário, 
                velocidade, tensão trativa e verificará os critérios normativos.</li>
                <li><strong>Resultados:</strong> Visualize o dimensionamento na tabela, analise o perfil longitudinal 
                e exporte os quantitativos para orçamento.</li>
            </ol>
        ''',
        'without_tool': '''
            <h5>Sem Esta Ferramenta</h5>
            <p>Tradicionalmente, o dimensionamento de microdrenagem urbana exigia:</p>
            <ul>
                <li>Cálculos manuais extensos com planilhas Excel complexas</li>
                <li>Consulta a tabelas de diâmetros comerciais e verificação iterativa</li>
                <li>Desenho manual de perfis longitudinais no CAD</li>
                <li>Levantamento de quantitativos item por item</li>
                <li>Alto risco de erros em projetos com muitos trechos</li>
            </ul>
            <p>A ferramenta automatiza todo este processo, reduzindo erros e aumentando a produtividade do projetista.</p>
        ''',
        'references': '''
            <h5>Referências Técnicas</h5>
            <ul>
                <li>CETESB - Drenagem Urbana: Manual de Projeto</li>
                <li>DAEE/CETESB - Drenagem Urbana (1980)</li>
                <li>Porto, R.M. - Hidráulica Básica, EESC-USP</li>
                <li>Tucci, C.E.M. - Hidrologia: Ciência e Aplicação</li>
                <li>NBR 10844 - Instalações prediais de águas pluviais</li>
            </ul>
        '''
    },
    'idfgeo': {
        'title': 'IDFGeo RS',
        'icon': 'bi-cloud-rain',
        'description': 'Mapa interativo de equações de chuva (IDF) para o Rio Grande do Sul.',
        'developer': 'Rodrigo Emanuel Rabello',
        'developer_title': 'Engenheiro Civil',
        'developer_location': 'Nova Petrópolis, RS - Brasil',
        'theory': '''
            <h5>Fundamentação Teórica</h5>
            <p>O IDFGeo RS é baseado no trabalho desenvolvido pelo Programa de Pós-Graduação em Recursos Hídricos 
            da Universidade Federal de Pelotas (UFPel).</p>
            
            <h6>Equações IDF</h6>
            <p>As equações Intensidade-Duração-Frequência (IDF) relacionam a intensidade da chuva com sua duração 
            e período de retorno. São fundamentais para o dimensionamento de obras hidráulicas.</p>
            
            <h6>Coeficientes Espacializados</h6>
            <p>O trabalho original da UFPel desenvolveu uma metodologia para espacialização dos parâmetros IDF 
            em todo o território do Rio Grande do Sul, utilizando técnicas de geoprocessamento e análise de 
            séries históricas de precipitação.</p>
            
            <h6>Autores do Trabalho Original</h6>
            <ul>
                <li>Aryane Araujo Rodrigues</li>
                <li>Tirzah Moreira Siqueira</li>
                <li>Tamara Leitzke Caldeira Beskow</li>
                <li>Samuel Beskow</li>
                <li>Luís Carlos Timm</li>
            </ul>
        ''',
        'how_it_works': '''
            <h5>Como Utilizar</h5>
            <ol>
                <li><strong>Visualizar Mapas:</strong> Selecione entre os coeficientes A (magnitude) ou B (frequência) 
                para visualizar a distribuição espacial no RS.</li>
                <li><strong>Clicar no Mapa:</strong> Clique em qualquer ponto do mapa para obter os parâmetros IDF 
                para aquela localização específica.</li>
                <li><strong>Usar Cidades:</strong> Utilize o botão "Cidades" para visualizar pontos de referência 
                com equações já calibradas.</li>
                <li><strong>Calcular Intensidades:</strong> Com os parâmetros obtidos, calcule intensidades para 
                diferentes durações e tempos de retorno.</li>
            </ol>
        ''',
        'without_tool': '''
            <h5>Sem Esta Ferramenta</h5>
            <p>Antes desta ferramenta, engenheiros precisavam:</p>
            <ul>
                <li>Buscar equações IDF em publicações acadêmicas dispersas</li>
                <li>Utilizar equações de cidades próximas, não necessariamente representativas</li>
                <li>Realizar interpolações manuais entre estações pluviométricas</li>
                <li>Consultar órgãos estaduais para obtenção de dados</li>
            </ul>
            <p>O IDFGeo RS centraliza e espacializa essas informações, permitindo obter parâmetros IDF 
            confiáveis para qualquer ponto do Rio Grande do Sul.</p>
        ''',
        'references': '''
            <h5>Referências Técnicas</h5>
            <ul>
                <li>Rodrigues, A.A. et al. - Trabalho de Pós-Graduação em Recursos Hídricos (UFPel, 2023)</li>
                <li><a href="/static/docs/ppgrh_rodrigues_2023.pdf" target="_blank">Download do trabalho original</a></li>
                <li>Programa de Pós-Graduação em Recursos Hídricos - UFPel</li>
            </ul>
        '''
    },
    'mapa_fotos': {
        'title': 'Mapa de Fotos',
        'icon': 'bi-images',
        'description': 'Visualizador de fotos geolocalizadas em mapa interativo.',
        'developer': 'Rodrigo Emanuel Rabello',
        'developer_title': 'Engenheiro Civil',
        'developer_location': 'Nova Petrópolis, RS - Brasil',
        'theory': '''
            <h5>Fundamentação Teórica</h5>
            <p>O mapeamento fotográfico utiliza dados EXIF (Exchangeable Image File Format) presentes nas 
            fotografias digitais para extrair coordenadas GPS e posicionar as imagens em um mapa.</p>
            
            <h6>Dados EXIF</h6>
            <p>As câmeras e smartphones modernos registram automaticamente informações como:</p>
            <ul>
                <li>Coordenadas GPS (latitude e longitude)</li>
                <li>Data e hora da captura</li>
                <li>Direção (azimute) da câmera</li>
                <li>Altitude</li>
            </ul>
            
            <h6>Ferramentas de Medição</h6>
            <p>O mapa inclui ferramentas para medição de distâncias e áreas, úteis para levantamentos 
            preliminares e verificações em campo.</p>
        ''',
        'how_it_works': '''
            <h5>Como Utilizar</h5>
            <ol>
                <li><strong>Selecionar Fotos:</strong> Clique em "Selecionar Fotos" ou "Selecionar Pasta" 
                para escolher as imagens com geolocalização.</li>
                <li><strong>Processamento:</strong> O sistema processará as fotos e extrairá as coordenadas GPS 
                dos metadados EXIF.</li>
                <li><strong>Visualização:</strong> As fotos serão exibidas como marcadores no mapa. Clique 
                em cada marcador para ver a miniatura.</li>
                <li><strong>Expandir:</strong> Clique em "Expandir" para visualizar a foto em tamanho completo.</li>
                <li><strong>Medir:</strong> Use as ferramentas de medição (📏) para calcular distâncias 
                e áreas no mapa.</li>
            </ol>
            <p><strong>Privacidade:</strong> Todo o processamento é feito localmente no navegador. 
            Nenhuma foto é enviada ao servidor.</p>
        ''',
        'without_tool': '''
            <h5>Sem Esta Ferramenta</h5>
            <p>Para visualizar fotos geolocalizadas sem esta ferramenta, seria necessário:</p>
            <ul>
                <li>Exportar coordenadas manualmente de cada foto</li>
                <li>Criar arquivos KML/KMZ para Google Earth</li>
                <li>Utilizar softwares de GIS como QGIS ou ArcGIS</li>
                <li>Pagar por serviços online de mapeamento fotográfico</li>
            </ul>
            <p>Esta ferramenta simplifica o processo, permitindo visualização instantânea no navegador.</p>
        ''',
        'references': '''
            <h5>Referências Técnicas</h5>
            <ul>
                <li>EXIF Specification - JEITA/CIPA</li>
                <li>Leaflet.js - Biblioteca de mapas interativos</li>
                <li>OpenStreetMap - Base cartográfica</li>
            </ul>
        '''
    },
    'hidrograma': {
        'title': 'HidroCalc Pro',
        'icon': 'bi-graph-up',
        'description': 'Geração de hidrogramas pelo método SCS e distribuição temporal HUFF.',
        'developer': 'Rodrigo Emanuel Rabello',
        'developer_title': 'Engenheiro Civil',
        'developer_location': 'Nova Petrópolis, RS - Brasil',
        'theory': '''
            <h5>Fundamentação Teórica</h5>
            
            <h6>Método SCS (Soil Conservation Service)</h6>
            <p>O método do Hidrograma Unitário Sintético do SCS é uma das metodologias mais utilizadas 
            mundialmente para transformação chuva-vazão em bacias hidrográficas.</p>
            
            <h6>Curve Number (CN)</h6>
            <p>O CN é um parâmetro que representa a capacidade de infiltração do solo, variando de 30 
            (muito permeável) a 98 (praticamente impermeável).</p>
            
            <h6>Abstrações</h6>
            <ul>
                <li><strong>S (Retenção Potencial):</strong> S = 25400/CN - 254 (mm)</li>
                <li><strong>Ia (Abstração Inicial):</strong> Ia = 0.2 × S (mm)</li>
                <li><strong>Precipitação Efetiva:</strong> Pe = (P - Ia)² / (P - Ia + S)</li>
            </ul>
            
            <h6>Distribuição Temporal HUFF</h6>
            <p>A distribuição temporal da chuva segue os quartis de HUFF, que classificam as tormentas 
            conforme o momento de maior intensidade:</p>
            <ul>
                <li><strong>1º Quartil:</strong> Pico no início da chuva</li>
                <li><strong>2º Quartil:</strong> Pico no segundo quarto</li>
                <li><strong>3º Quartil:</strong> Pico no terceiro quarto</li>
                <li><strong>4º Quartil:</strong> Pico no final da chuva</li>
            </ul>
            
            <h6>Tempo de Concentração (Kirpich)</h6>
            <p>tc = 57 × (L³/H)^0.385 (minutos)</p>
        ''',
        'how_it_works': '''
            <h5>Como Utilizar</h5>
            <ol>
                <li><strong>Dados da Bacia:</strong>
                    <ul>
                        <li>Informe a área da bacia (km²)</li>
                        <li>Digite o comprimento do talvegue (km)</li>
                        <li>Insira o desnível (m)</li>
                        <li>Ajuste o Curve Number (CN) conforme uso do solo</li>
                    </ul>
                </li>
                <li><strong>Chuva de Projeto:</strong>
                    <ul>
                        <li>Selecione o tempo de recorrência (TR)</li>
                        <li>Defina a duração da chuva (min)</li>
                        <li>Opcionalmente, edite os parâmetros IDF</li>
                    </ul>
                </li>
                <li><strong>Resultados:</strong> Visualize os gráficos dinâmicos, tabelas detalhadas 
                e exporte o memorial em PDF.</li>
            </ol>
        ''',
        'without_tool': '''
            <h5>Sem Esta Ferramenta</h5>
            <p>O cálculo manual de hidrogramas requer:</p>
            <ul>
                <li>Planilhas complexas com múltiplas abas</li>
                <li>Cálculo iterativo da convolução</li>
                <li>Desenho manual de gráficos</li>
                <li>Elaboração de memorial descritivo</li>
                <li>Alto tempo de processamento para cada cenário</li>
            </ul>
            <p>O HidroCalc Pro automatiza todo o processo e gera memoriais profissionais prontos para uso.</p>
        ''',
        'references': '''
            <h5>Referências Técnicas</h5>
            <ul>
                <li>USDA - National Engineering Handbook, Part 630 Hydrology</li>
                <li>SCS - Urban Hydrology for Small Watersheds (TR-55)</li>
                <li>Huff, F.A. - Time Distribution of Rainfall in Heavy Storms</li>
                <li>Tucci, C.E.M. - Hidrologia: Ciência e Aplicação</li>
            </ul>
        '''
    },
    'pavimentacao': {
        'title': 'Pavimentação.br',
        'icon': 'bi-cone-striped',
        'description': 'Dimensionamento de pavimentos flexíveis pelo método DNIT.',
        'developer': 'Rodrigo Emanuel Rabello',
        'developer_title': 'Engenheiro Civil',
        'developer_location': 'Nova Petrópolis, RS - Brasil',
        'theory': '''
            <h5>Fundamentação Teórica</h5>
            
            <h6>Método DNIT/DNER</h6>
            <p>O dimensionamento de pavimentos flexíveis no Brasil segue a metodologia desenvolvida pelo 
            DNIT (antigo DNER), baseada no método CBR e no conceito de número estrutural.</p>
            
            <h6>Número N (Tráfego)</h6>
            <p>O número N representa o número equivalente de operações do eixo padrão de 8,2 tf durante 
            o período de projeto. É calculado considerando:</p>
            <ul>
                <li>Volume médio diário (VMD) de veículos</li>
                <li>Taxa de crescimento anual</li>
                <li>Período de projeto</li>
                <li>Fatores de equivalência de carga</li>
            </ul>
            
            <h6>CBR (California Bearing Ratio)</h6>
            <p>O CBR é um índice de suporte do subleito que indica a capacidade do solo de resistir 
            aos esforços do tráfego.</p>
            
            <h6>Espessuras Mínimas</h6>
            <p>As espessuras das camadas são determinadas em função do N de projeto e do CBR do subleito, 
            seguindo ábacos e tabelas normativas do DNIT.</p>
        ''',
        'how_it_works': '''
            <h5>Como Utilizar</h5>
            <ol>
                <li><strong>Dados de Tráfego:</strong>
                    <ul>
                        <li>Informe o volume médio diário de veículos</li>
                        <li>Defina a composição do tráfego</li>
                        <li>Configure a taxa de crescimento</li>
                    </ul>
                </li>
                <li><strong>Dados do Solo:</strong>
                    <ul>
                        <li>Informe o CBR do subleito</li>
                        <li>Defina a expansão</li>
                    </ul>
                </li>
                <li><strong>Estrutura:</strong>
                    <ul>
                        <li>Selecione os materiais para cada camada</li>
                        <li>Configure as propriedades</li>
                    </ul>
                </li>
                <li><strong>Drenagem:</strong> Configure os parâmetros de drenagem se necessário.</li>
                <li><strong>Relatório:</strong> Gere o relatório técnico com as espessuras dimensionadas.</li>
            </ol>
        ''',
        'without_tool': '''
            <h5>Sem Esta Ferramenta</h5>
            <p>O dimensionamento manual de pavimentos exige:</p>
            <ul>
                <li>Cálculos extensos do número N</li>
                <li>Consulta a múltiplos ábacos e tabelas</li>
                <li>Verificação iterativa de espessuras</li>
                <li>Conhecimento profundo das normas DNIT</li>
            </ul>
            <p>A ferramenta Pavimentação.br automatiza o processo seguindo rigorosamente a metodologia DNIT.</p>
        ''',
        'references': '''
            <h5>Referências Técnicas</h5>
            <ul>
                <li>DNIT - Manual de Pavimentação</li>
                <li>DNIT - Manual de Restauração de Pavimentos Asfálticos</li>
                <li>DNER-PRO 269/94 - Projeto de Restauração de Pavimentos Flexíveis</li>
                <li>Medina, J. - Mecânica dos Pavimentos</li>
            </ul>
        '''
    },
    'dimensionamento': {
        'title': 'Dimensionamento Hidráulico',
        'icon': 'bi-droplet',
        'description': 'Ferramenta para dimensionamento de estruturas hidráulicas.',
        'developer': 'Rodrigo Emanuel Rabello',
        'developer_title': 'Engenheiro Civil',
        'developer_location': 'Nova Petrópolis, RS - Brasil',
        'theory': '''
            <h5>Fundamentação Teórica</h5>
            
            <h6>Hidráulica de Condutos</h6>
            <p>O dimensionamento de condutos hidráulicos é baseado nas equações fundamentais da hidráulica, 
            incluindo a equação de Manning para escoamentos em canais e condutos.</p>
            
            <h6>Equação de Manning</h6>
            <p class="text-center"><strong>V = (1/n) × R<sup>2/3</sup> × S<sup>1/2</sup></strong></p>
            <p>Onde:</p>
            <ul>
                <li><strong>V</strong> = Velocidade média (m/s)</li>
                <li><strong>n</strong> = Coeficiente de rugosidade</li>
                <li><strong>R</strong> = Raio hidráulico (m)</li>
                <li><strong>S</strong> = Declividade (m/m)</li>
            </ul>
            
            <h6>Critérios de Dimensionamento</h6>
            <ul>
                <li>Velocidade mínima: 0.6 m/s (autolimpeza)</li>
                <li>Velocidade máxima: 5.0 m/s (erosão)</li>
                <li>Tensão trativa mínima: 1.0 Pa</li>
                <li>Lâmina máxima: 85% do diâmetro</li>
            </ul>
        ''',
        'how_it_works': '''
            <h5>Como Utilizar</h5>
            <ol>
                <li><strong>Selecione a Região:</strong> Escolha a cidade/região para obter a equação IDF adequada.</li>
                <li><strong>Defina Parâmetros:</strong> Configure o tempo de recorrência e características da área.</li>
                <li><strong>Informe os Dados:</strong> Entre com os dados geométricos e hidrológicos do projeto.</li>
                <li><strong>Analise Resultados:</strong> Verifique o dimensionamento sugerido e os critérios atendidos.</li>
            </ol>
        ''',
        'without_tool': '''
            <h5>Sem Esta Ferramenta</h5>
            <p>O dimensionamento hidráulico manual requer:</p>
            <ul>
                <li>Tabelas extensas de coeficientes</li>
                <li>Cálculos iterativos para encontrar o diâmetro adequado</li>
                <li>Verificação individual de cada critério</li>
                <li>Consulta a múltiplas normas técnicas</li>
            </ul>
        ''',
        'references': '''
            <h5>Referências Técnicas</h5>
            <ul>
                <li>Porto, R.M. - Hidráulica Básica</li>
                <li>Azevedo Netto - Manual de Hidráulica</li>
                <li>NBR 9649 - Projeto de redes coletoras de esgoto sanitário</li>
            </ul>
        '''
    }
}


def manual(request, app_name=None):
    """View for displaying help/manual pages for tools."""
    # List of all available tools
    tools = [
        {'id': 'microdrenagem', 'name': 'Microdrenagem Urbana', 'icon': 'bi-bezier', 'url': 'ferramenta_drenagem:microdrenagem'},
        {'id': 'idfgeo', 'name': 'IDFGeo RS', 'icon': 'bi-cloud-rain', 'url': 'ferramenta_drenagem:idfgeo'},
        {'id': 'mapa_fotos', 'name': 'Mapa de Fotos', 'icon': 'bi-images', 'url': 'mapa_fotos:mapa'},
        {'id': 'hidrograma', 'name': 'HidroCalc Pro', 'icon': 'bi-graph-up', 'url': 'hidrograma:index'},
        {'id': 'pavimentacao', 'name': 'Pavimentação.br', 'icon': 'bi-cone-striped', 'url': 'pavimentacao:index'},
        {'id': 'dimensionamento', 'name': 'Dimensionamento Hidráulico', 'icon': 'bi-droplet', 'url': 'ferramenta_drenagem:dimensionamento'},
    ]
    
    if app_name and app_name in MANUAL_CONTENT:
        # Show specific tool manual
        content = MANUAL_CONTENT[app_name]
        context = {
            'title': f'Manual - {content["title"]}',
            'content': content,
            'app_name': app_name,
            'tools': tools,
        }
        return render(request, 'usuarios/manual_detail.html', context)
    else:
        # Show manual index with all tools
        context = {
            'title': 'Manual de Instruções e Ajuda',
            'tools': tools,
            'manual_content': MANUAL_CONTENT,
        }
        return render(request, 'usuarios/manual_index.html', context)


def public_home(request):
    """Public homepage - accessible without login."""
    context = {
        'title': 'Início',
    }
    return render(request, 'public_home.html', context)


@login_required(login_url='usuarios:login')
def dashboard(request):
    """Restricted landing page."""
    context = {
        'title': 'Início',
    }
    return render(request, 'usuarios/dashboard.html', context)


@login_required(login_url='usuarios:login')
def dashboard_new(request):
    """Pilot new unified layout dashboard."""
    context = {
        'title': 'Início (Piloto)',
    }
    return render(request, 'usuarios/dashboard_new.html', context)


def home(request):
    """Redirect to appropriate page based on auth status."""
    if request.user.is_authenticated:
        return redirect('usuarios:dashboard')
    return redirect('usuarios:public_home')


@require_http_methods(["GET", "POST"])
def register(request):
    """User registration view with post-approval access control."""
    domain_groups = list(
        EmailDomainGroup.objects.order_by('domain').values_list('domain', flat=True)
    )

    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.is_active = False  # aguardará aprovação
            user.save()

            email_domain = form.cleaned_data['email'].split('@')[1].lower()
            domain_group, _ = EmailDomainGroup.objects.get_or_create(domain=email_domain)
            UserAccessProfile.objects.create(user=user, domain_group=domain_group)

            messages.success(
                request,
                'Cadastro recebido! Aguarde a aprovação do administrador para acessar as áreas restritas.'
            )
            return redirect('usuarios:login')
    else:
        form = RegistrationForm()
    return render(
        request,
        'usuarios/register.html',
        {
            'form': form,
            'domain_groups': domain_groups,
        },
    )
