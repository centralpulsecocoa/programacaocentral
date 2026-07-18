import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar todos os agendamentos
    const schedulings = await base44.asServiceRole.entities.Scheduling.list('-date');
    
    // Buscar todos os registros de qualidade
    const qualityRecords = await base44.asServiceRole.entities.Quality.list('-date');

    // Formatar dados de AGENDAMENTOS para Power BI
    const schedulingData = schedulings.map(s => {
      // Calcular durações
      const calculateDuration = (startTime, endTime) => {
        if (!startTime || !endTime) return null;
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        return (endH * 60 + endM) - (startH * 60 + startM);
      };

      const calculateTime = (startTime, endTime) => {
        const minutes = calculateDuration(startTime, endTime);
        if (!minutes) return null;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      };

      // Durações em minutos e formatadas
      const durationPredicted = calculateDuration(s.start_time, s.end_time_predicted);
      const durationActual = calculateDuration(s.start_time_actual || s.start_time, s.end_time_actual);
      const waitingTime = calculateDuration(s.arrival_time, s.call_time);
      const delayStart = calculateDuration(s.start_time, s.start_time_actual);
      const timeToCall = calculateDuration(s.arrival_time, s.call_time);

      return {
        // Identificadores
        id: s.id,
        created_date: s.created_date,
        created_by: s.created_by,
        updated_date: s.updated_date,

        // Data e Status
        date: s.date,
        status: s.status,
        status_label: {
          agendado: 'Agendado',
          aguardando: 'Aguardando',
          em_descarga: 'Em Descarga',
          concluido: 'Concluído',
          cancelado: 'Cancelado'
        }[s.status] || s.status,

        // Fornecedor
        supplier: s.supplier,

        // Local
        warehouse: s.warehouse,
        warehouse_label: s.warehouse === 'central' ? 'Central' : 'Fábrica',
        line: s.line,
        line_full: `${s.warehouse === 'central' ? 'Central' : 'Fábrica'} - Linha ${s.line}`,

        // Horários - Agendados
        start_time_scheduled: s.start_time,
        end_time_predicted: s.end_time_predicted,
        duration_predicted_minutes: durationPredicted,
        duration_predicted_formatted: calculateTime(s.start_time, s.end_time_predicted),

        // Horários - Reais (Balança)
        arrival_time: s.arrival_time,
        call_time: s.call_time,
        waiting_time_minutes: waitingTime,
        waiting_time_formatted: calculateTime(s.arrival_time, s.call_time),
        time_to_call_minutes: timeToCall,
        time_to_call_formatted: calculateTime(s.arrival_time, s.call_time),

        // Horários - Reais (Operador)
        start_time_actual: s.start_time_actual,
        end_time_actual: s.end_time_actual,
        duration_actual_minutes: durationActual,
        duration_actual_formatted: calculateTime(s.start_time_actual || s.start_time, s.end_time_actual),

        // Atrasos e Diferenças
        delay_start_minutes: delayStart,
        delay_start_formatted: calculateTime(s.start_time, s.start_time_actual),
        duration_difference_minutes: durationActual && durationPredicted ? durationActual - durationPredicted : null,

        // Quantidades - Planejadas
        quantity_bags_planned: s.quantity_bags,
        quantity_tons_planned: s.quantity_tons,
        quantity_bags_actual: s.actual_bags,
        quantity_difference_bags: s.actual_bags ? s.actual_bags - s.quantity_bags : null,

        // Pesagem - Balança
        gross_weight_kg: s.gross_weight,
        tare_weight_kg: s.tare_weight,
        net_weight_kg: s.net_weight,
        net_weight_tons: s.net_weight ? s.net_weight / 1000 : null,
        
        // Balancinha
        balancinha_kg: s.balancinha ? parseFloat(s.balancinha) : null,
        balancinha_difference_kg: s.balancinha && s.net_weight ? parseFloat(s.balancinha) - s.net_weight : null,

        // Documentos
        wb_number: s.wb_number,
        load_number: s.load_number,
        tracking_code: s.tracking_code,
        invoice_number: s.invoice_number,

        // Contrato e Certificação
        contract: s.contract,
        contract_label: s.contract || 'N/A',
        eudr_cvn: s.eudr_cvn,
        eudr_cvn_label: s.eudr_cvn === 'EUDR' ? 'EUDR' : s.eudr_cvn === 'CVN' ? 'CVN' : 'N/A',
        apanha_status: s.apanha_status,
        freight_label: s.apanha_status === 'Apanha' ? 'Apanha' : 'NA',

        // Veículo e Motorista
        vehicle_plate: s.vehicle_plate,
        driver_name: s.driver_name,
        driver_phone: s.driver_phone,

        // Observações
        notes: s.notes,

        // Métricas Calculadas
        efficiency_percent: durationActual && durationPredicted && durationPredicted > 0 
          ? ((durationPredicted / durationActual) * 100).toFixed(2)
          : null,
        
        on_time: delayStart && delayStart <= 15 ? 'Sim' : delayStart ? 'Não' : null,
        
        weight_accuracy_percent: s.net_weight && s.quantity_tons 
          ? (((s.net_weight / 1000) / s.quantity_tons) * 100).toFixed(2)
          : null,

        // Flags Booleanos para filtros fáceis no Power BI
        is_completed: s.status === 'concluido' ? 1 : 0,
        is_in_progress: s.status === 'em_descarga' ? 1 : 0,
        is_waiting: s.status === 'aguardando' ? 1 : 0,
        is_scheduled: s.status === 'agendado' ? 1 : 0,
        is_cancelled: s.status === 'cancelado' ? 1 : 0,
        
        has_delay: delayStart && delayStart > 15 ? 1 : 0,
        has_weighing: s.net_weight ? 1 : 0,
        has_balancinha: s.balancinha ? 1 : 0,

        // Data e Hora separadas para facilitar análises temporais
        date_year: s.date ? parseInt(s.date.substring(0, 4)) : null,
        date_month: s.date ? parseInt(s.date.substring(5, 7)) : null,
        date_day: s.date ? parseInt(s.date.substring(8, 10)) : null,
        date_week: s.date ? getWeekNumber(new Date(s.date)) : null,
        date_quarter: s.date ? Math.floor((parseInt(s.date.substring(5, 7)) - 1) / 3) + 1 : null,

        // Período do dia
        time_period: s.start_time ? getTimePeriod(s.start_time) : null,
      };
    });

    // Formatar dados de QUALIDADE para Power BI
    const qualityData = qualityRecords.map(q => {
      // Calcular tempo de liberação em minutos
      const calculateDuration = (startTime, endTime) => {
        if (!startTime || !endTime) return null;
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        return (endH * 60 + endM) - (startH * 60 + startM);
      };

      const releaseDurationMinutes = calculateDuration(q.reception_time, q.release_time);

      return {
        // Identificadores
        id: q.id,
        created_date: q.created_date,
        created_by: q.created_by,
        updated_date: q.updated_date,

        // Data e Identificação
        date: q.date,
        sample: q.sample,
        released_by: q.released_by,
        
        // Horários
        reception_time: q.reception_time,
        release_time: q.release_time,
        release_duration_formatted: q.release_duration,
        release_duration_minutes: releaseDurationMinutes,

        // Categorização
        origin: q.origin,
        type: q.type,
        justification: q.justification,
        observations: q.observations,

        // Análises Percentuais
        germinated_percent: q.germinated_percent,
        flat_percent: q.flat_percent,
        insect_damaged_percent: q.insect_damaged_percent,
        slaty_percent: q.slaty_percent,
        moisture_percent: q.moisture_percent,
        mouldy_percent: q.mouldy_percent,
        external_mould_percent: q.external_mould_percent,
        violet_percent: q.violet_percent,
        shell_percent: q.shell_percent,

        // Outros Parâmetros
        fumaca: q.fumaca ? parseFloat(q.fumaca) : null,
        fumaca_text: q.fumaca,
        bean_count: q.bean_count,
        ffa: q.ffa,
        duplo: q.duplo,
        residuo: q.residuo,

        // Flags de Qualidade
        has_fumaca: q.fumaca && q.fumaca !== "" ? 1 : 0,
        moisture_acceptable: q.moisture_percent && q.moisture_percent <= 8 ? 1 : 0,
        mouldy_acceptable: q.mouldy_percent && q.mouldy_percent <= 3 ? 1 : 0,
        
        // Classificação de Tempo de Liberação
        release_speed: releaseDurationMinutes ? 
          (releaseDurationMinutes <= 60 ? 'Rápido' : 
           releaseDurationMinutes <= 120 ? 'Normal' : 'Demorado') : null,

        // Data separada para análises temporais
        date_year: q.date ? parseInt(q.date.substring(0, 4)) : null,
        date_month: q.date ? parseInt(q.date.substring(5, 7)) : null,
        date_day: q.date ? parseInt(q.date.substring(8, 10)) : null,
        date_week: q.date ? getWeekNumber(new Date(q.date)) : null,
        date_quarter: q.date ? Math.floor((parseInt(q.date.substring(5, 7)) - 1) / 3) + 1 : null,
      };
    });

    // Ordenar dados
    schedulingData.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.start_time_scheduled || '').localeCompare(a.start_time_scheduled || '');
    });

    qualityData.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.sample || '').localeCompare(a.sample || '');
    });

    // Retornar ambos os datasets
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      datasets: {
        scheduling: {
          total_records: schedulingData.length,
          data: schedulingData
        },
        quality: {
          total_records: qualityData.length,
          data: qualityData
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error in powerBIDataExport:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});

// Função auxiliar para calcular semana do ano
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Função auxiliar para determinar período do dia
function getTimePeriod(time) {
  if (!time) return null;
  const hour = parseInt(time.split(':')[0]);
  if (hour >= 7 && hour < 12) return 'Manhã';
  if (hour >= 12 && hour < 18) return 'Tarde';
  if (hour >= 18 && hour < 22) return 'Noite';
  return 'Madrugada';
}