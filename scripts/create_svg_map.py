import json
import urllib.request
import math

def download_and_process_svg():
    print("Iniciando geração do mapa SVG a partir de GeoJSON...")
    
    # URL do GeoJSON dos estados brasileiros
    geojson_url = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson"
    output_path = "/var/www/resolve_django/banco_idf/templates/banco_idf/brazil_map.svg"
    
    try:
        # Baixar GeoJSON
        print(f"Baixando GeoJSON de {geojson_url}...")
        with urllib.request.urlopen(geojson_url) as response:
            data = json.loads(response.read().decode())
        
        print(f"GeoJSON baixado. Processando {len(data['features'])} estados...")
        
        # Encontrar bounding box global
        min_lon, max_lon = 180, -180
        min_lat, max_lat = 90, -90
        
        for feature in data['features']:
            geom = feature['geometry']
            coords_list = []
            
            if geom['type'] == 'Polygon':
                coords_list = geom['coordinates']
            elif geom['type'] == 'MultiPolygon':
                for poly in geom['coordinates']:
                    coords_list.extend(poly)
            
            for ring in coords_list:
                for lon, lat in ring:
                    if lon < min_lon: min_lon = lon
                    if lon > max_lon: max_lon = lon
                    if lat < min_lat: min_lat = lat
                    if lat > max_lat: max_lat = lat
        
        # Adicionar margem
        margin = 0.5
        min_lon -= margin
        max_lon += margin
        min_lat -= margin
        max_lat += margin
        
        # Calcular proporções para o SVG
        svg_width = 800
        geo_width = max_lon - min_lon
        geo_height = max_lat - min_lat
        
        # Manter aspect ratio
        ratio = geo_height / geo_width
        svg_height = int(svg_width * ratio)
        
        print(f"Dimensões SVG calculadas: {svg_width}x{svg_height}")
        
        # Funções de projeção
        def project_x(lon):
            return (lon - min_lon) * (svg_width / geo_width)
        
        def project_y(lat):
            # Y invertido no SVG (topo é 0)
            return (max_lat - lat) * (svg_height / geo_height)
        
        # Gerar paths
        paths = []
        labels = []
        
        for feature in data['features']:
            props = feature['properties']
            sigla = props.get('sigla')
            if not sigla: continue
            
            geom = feature['geometry']
            path_data = ""
            
            # Calcular centróide simples para o label
            centroid_x = 0
            centroid_y = 0
            point_count = 0
            
            polygons = []
            if geom['type'] == 'Polygon':
                polygons = [geom['coordinates']]
            elif geom['type'] == 'MultiPolygon':
                polygons = geom['coordinates']
                
            for poly in polygons:
                for ring in poly:
                    if not ring: continue
                    
                    # Move to first point
                    start_x = project_x(ring[0][0])
                    start_y = project_y(ring[0][1])
                    path_data += f"M{start_x:.1f},{start_y:.1f} "
                    
                    centroid_x += start_x
                    centroid_y += start_y
                    point_count += 1
                    
                    for lon, lat in ring[1:]:
                        px = project_x(lon)
                        py = project_y(lat)
                        path_data += f"L{px:.1f},{py:.1f} "
                        
                        centroid_x += px
                        centroid_y += py
                        point_count += 1
                    
                    path_data += "Z "
            
            if point_count > 0:
                avg_x = centroid_x / point_count
                avg_y = centroid_y / point_count
                
                # Ajustes manuais de labels se necessário
                if sigla == 'DF': # DF é muito pequeno
                    avg_y -= 5
                elif sigla == 'RJ':
                    avg_x += 5
                elif sigla == 'ES':
                    avg_x += 5
                elif sigla == 'SE':
                    avg_x += 10
                elif sigla == 'AL':
                    avg_x += 10
                elif sigla == 'PB':
                    avg_x += 10
                elif sigla == 'PE':
                    avg_x += 15
                elif sigla == 'RN':
                    avg_x += 5
                    avg_y -= 5
                    
                labels.append({'sigla': sigla, 'x': avg_x, 'y': avg_y})
            
            paths.append({'id': sigla, 'd': path_data})
            
        # Ordenar labels e paths para consistência
        paths.sort(key=lambda x: x['id'])
        labels.sort(key=lambda x: x['sigla'])
        
        # Construir SVG
        svg_lines = [
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {svg_width} {svg_height}" style="width: 100%; height: auto;">',
            '<style>',
            '    .state { fill: #e9ecef; stroke: #fff; stroke-width: 1; transition: all 0.3s; cursor: pointer; }',
            '    .state:hover { fill: #0d6efd; }',
            '    .state.active { fill: #0d6efd; stroke: #0a58ca; }',
            '    .state-text { font-size: 12px; font-weight: bold; fill: #495057; pointer-events: none; text-anchor: middle; dominant-baseline: middle; }',
            '    .state:hover + .state-text { fill: white; }',
            '    .state.active + .state-text { fill: white; }',
            '</style>',
            '<g id="brazil-states">'
        ]
        
        for p in paths:
            svg_lines.append(f'    <path id="{p["id"]}" class="state" d="{p["d"]}"/>')
            
        svg_lines.append('</g>')
        svg_lines.append('<g id="labels">')
        
        for l in labels:
            svg_lines.append(f'    <text x="{l["x"]:.1f}" y="{l["y"]:.1f}" class="state-text">{l["sigla"]}</text>')
            
        svg_lines.append('</g>')
        svg_lines.append('</svg>')
        
        # Salvar arquivo
        with open(output_path, "w", encoding="utf-8") as f:
            f.write('\n'.join(svg_lines))
            
        print(f"Mapa SVG gerado com sucesso em: {output_path}")
        
    except Exception as e:
        print(f"Erro ao gerar mapa: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    download_and_process_svg()
