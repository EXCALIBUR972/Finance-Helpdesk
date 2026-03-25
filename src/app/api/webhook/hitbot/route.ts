import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendAperturaEmail } from '@/app/actions/emails';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { from, text, name, file_url, media_url } = body;
    const attachmentUrl = file_url || media_url || null;

    if (!from || (!text && !attachmentUrl)) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (from, text o attachment)' }, { status: 400 });
    }

    // 1. Buscar o crear el cliente
    let { data: cliente, error: clientError } = await supabaseAdmin
      .from('clientes')
      .select('*')
      .eq('telefono_wsp', from)
      .single();

    if (clientError && clientError.code !== 'PGRST116') { // PGRST116 is "no rows found"
      throw clientError;
    }

    if (!cliente) {
      const { data: newClient, error: createClientError } = await supabaseAdmin
        .from('clientes')
        .insert([{ 
           telefono_wsp: from, 
           nombre: name || 'Cliente WhatsApp',
           apellidos: '',
           empresa: 'Finance App User'
        }])
        .select()
        .single();
      
      if (createClientError) throw createClientError;
      cliente = newClient;
    }

    // 2. Verificar si el cliente tiene un caso abierto
    let { data: casoActivo, error: caseError } = await supabaseAdmin
      .from('casos')
      .select('*')
      .eq('id_cliente', cliente!.id_cliente)
      .in('status', ['No resuelto', 'Pendiente'])
      .single();

    if (caseError && caseError.code !== 'PGRST116') {
      throw caseError;
    }

    let numeroRadicado: string;

    if (!casoActivo) {
      // 3. Crear nuevo caso si no hay uno abierto
      const count = await supabaseAdmin.from('casos').select('id_caso', { count: 'exact', head: true });
      const nextId = (count.count || 0) + 1001;
      numeroRadicado = `CASO-${nextId}`;

      const { data: newCase, error: createCaseError } = await supabaseAdmin
        .from('casos')
        .insert([{
          numero_radicado: numeroRadicado,
          id_cliente: cliente!.id_cliente,
          status: 'No resuelto',
          nivel_actual: 'L1',
          titulo: 'Solicitud vía WhatsApp'
        }])
        .select()
        .single();

      if (createCaseError) throw createCaseError;
      casoActivo = newCase;

      // Registrar evento de creación en la historia
      await supabaseAdmin.from('interacciones').insert([{
        id_caso: casoActivo!.id_caso,
        tipo_mensaje: 'Sistema',
        mensaje: `Ticket **creado vía WhatsApp** por el bot.`
      }]);

      // Enviar Email de Apertura
      if (cliente!.correo) {
        await sendAperturaEmail(cliente!.correo, cliente!.nombre || 'Cliente', numeroRadicado, 'Solicitud vía WhatsApp');
      }
    } else {
      numeroRadicado = casoActivo.numero_radicado;
    }

    // 4. Registrar la interacción (mensaje del cliente y adjunto si existe)
    const { error: interError } = await supabaseAdmin
      .from('interacciones')
      .insert([{
        id_caso: casoActivo!.id_caso,
        tipo_mensaje: 'Cliente',
        mensaje: text || 'Archivo adjunto recibido',
        archivo_url: attachmentUrl
      }]);

    if (interError) throw interError;

    // 5. Responder a HITBOT con el JSON esperado
    return NextResponse.json({
      status: 'success',
      message: `Hola ${name || ''}, hemos recibido tu mensaje. Tu número de radicado es ${numeroRadicado}. Un agente te contactará pronto.`,
      radicado: numeroRadicado
    });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
