export function generateTotalReport(sections) {
    const report = {
        items: [],
        totals: {
            pipeLen: 0,
            vol_0_15: 0,
            vol_15_30: 0,
            vol_30_plus: 0,
            shoring: 0,
            bedding: 0,
            joints: 0
        }
    };

    sections.forEach(sec => {

        const D = sec.diameter;
        const L = sec.length;
        const width = D + 0.60;
        


        const depthStart = sec.depthStart + 0.10;
        const depthEnd = sec.depthEnd + 0.10;
        const avgDepth = (depthStart + depthEnd) / 2;
        

        const totalVol = L * width * avgDepth;
        



        let h1 = Math.min(avgDepth, 1.5);
        let vol1 = L * width * h1;
        

        let h2 = Math.max(0, Math.min(avgDepth - 1.5, 1.5));
        let vol2 = L * width * h2;
        

        let h3 = Math.max(0, avgDepth - 3.0);
        let vol3 = L * width * h3;


        const shoring = 2 * L * avgDepth;
        

        const bedding = L * width * 0.10;


        const joints = Math.ceil(L / 2.5);

        report.items.push({
            id: sec.id,
            length: L,
            diameter: D,
            vol_0_15: vol1,
            vol_15_30: vol2,
            vol_30_plus: vol3,
            shoring: shoring,
            bedding: bedding,
            joints: joints
        });

        report.totals.pipeLen += L;
        report.totals.vol_0_15 += vol1;
        report.totals.vol_15_30 += vol2;
        report.totals.vol_30_plus += vol3;
        report.totals.shoring += shoring;
        report.totals.bedding += bedding;
        report.totals.joints += joints;
    });

    return report;
}

export function exportToCSV(report) {
    const data = report.items.map(item => ({
        Trecho: item.id,
        Extensao_m: item.length.toFixed(2),
        DN_m: item.diameter.toFixed(2),
        Escav_0_15_m3: item.vol_0_15.toFixed(2),
        Escav_15_30_m3: item.vol_15_30.toFixed(2),
        Escav_30_plus_m3: item.vol_30_plus.toFixed(2),
        Escoramento_m2: item.shoring.toFixed(2),
        Berco_m3: item.bedding.toFixed(2)
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quantitativos_drenagem.csv';
    link.click();
}

export function exportToPDF(report) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Relatório de Quantitativos - SMDU Web", 14, 20);
    
    doc.setFontSize(10);
    let y = 30;
    const headers = ["Trecho", "L(m)", "DN", "Vol<1.5", "Vol<3.0", "Vol>3.0", "Escora.", "Berço"];
    

    doc.setFont("helvetica", "bold");
    let x = 14;
    const colWidths = [30, 15, 15, 25, 25, 25, 25, 20];
    
    headers.forEach((h, i) => {
        doc.text(h, x, y);
        x += colWidths[i];
    });
    
    y += 6;
    doc.setFont("helvetica", "normal");
    
    report.items.forEach(item => {
        x = 14;
        const row = [
            item.id,
            item.length.toFixed(1),
            (item.diameter*1000).toFixed(0),
            item.vol_0_15.toFixed(1),
            item.vol_15_30.toFixed(1),
            item.vol_30_plus.toFixed(1),
            item.shoring.toFixed(1),
            item.bedding.toFixed(1)
        ];
        
        row.forEach((cell, i) => {
            doc.text(cell.toString(), x, y);
            x += colWidths[i];
        });
        y += 6;
    });
    
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("TOTAIS:", 14, y);
    doc.text(report.totals.vol_0_15.toFixed(2), 14+60, y);
    
    doc.save("orcamento_drenagem.pdf");
}
