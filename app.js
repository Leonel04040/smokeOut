
const express = require('express')
const session = require('express-session')
const mysql = require('mysql2')
var bodyParser = require('body-parser')
const path = require('path')

var app = express()

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

const PORT = process.env.PORT || 3000

const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_USER = process.env.DB_USER || 'root'
const DB_PASSWORD = process.env.DB_PASSWORD || 'n0m3l0'
const DB_NAME = process.env.DB_NAME || 'smokeout'
const DB_PORT = process.env.DB_PORT || 3306

var con = mysql.createConnection(
    {
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        port: DB_PORT
    })

app.use(express.static('views'))
con.connect()
app.use(bodyParser.json())
app.use(session(
    {
        secret: 'wgfoifgdldfv',
        resave: true,
        saveUninitialized: true
    }))

app.use(bodyParser.urlencoded(
    {
        extended:true
    }
))

app.listen(PORT,()=>
{
    console.log("Servidor escuchando en el puerto " + PORT)
})

//---------------------------------------------------------------------------------------------


//Inserciones post-----------------------------------------------------------------------------

app.post('/ingresar',(req,res)=>
{
    us = req.body.usuarioIn
    req.session.usuario = us

    let nombre = req.body.usuarioIn
    let pass = req.body.passIn
    var onloadCallback = function() {
        grecaptcha.render('html_element', {
          'sitekey' : '6LcpOC4jAAAAAF39W9i141rXwx9US5tr_wA0oFJi'
        });
      };

    con.query('select idusuario from usuario where persona_idpersona="'+nombre+'" and pass="'+pass+'"',(err,respuesta,fields)=>
    {
        if(err) return console.log(err)
        if(respuesta.length == 0) return res.redirect('/')
        return res.redirect('/inicio')
    })
})


app.post('/registrar', (req,res)=>
{
    let user = req.body.usuario
    let pass = req.body.pass
    let apellido = req.body.apellido
    let nombre = req.body.nombre
    let nacimiento = req.body.nacimiento
    let sexo = req.body.sexo
    let cigDiarios = req.body.cigDiarios
    let horaCig = req.body.horaCig

    console.log(user)
    console.log(pass)
    console.log(apellido)
    console.log(nombre)
    console.log(nacimiento)
    console.log(sexo)
    let continuar = false

    con.query('select * from usuario where persona_idpersona="'+user+'"', (err,respuesta,fields)=>
    {
        if(err)return console.log("Error",err)
        
        if(respuesta.length != 0)
        {
            continuar == false
            return res.send('<h1>nombre: El nombre de usuario ya existe, tienes que usar otro amigo</h1>')
        }
        continuar=true

        if(continuar)
        {
            con.query('insert into persona values("'+user+'", "'+nombre+'", "'+apellido+'", "'+nacimiento+'", '+sexo+')',(err,respuesta,fields)=>
            {
                if(err)
                {
                    return console.log(err)
                }
                console.log("se guardó la persona")

                con.query('insert into usuario(persona_idpersona, pass) values("'+user+'","'+pass+'")', (err,respuesta,fields)=>
                {
                    if(err)
                    {
                        return console.log(err)
                    }
                    us = req.body.usuario
                    req.session.usuario = us
                    console.log("se guardó el usuario")
                    con.query('insert into habitos_iniciales(hora_primer_cig, cig_diarios, persona_idpersona) values("'+horaCig+'",'+cigDiarios+',"'+user+'")', (err,respuesta,fields)=>
                    {
                        if(err)
                        {
                            return console.log(err)
                        }
                        console.log("se guardaron los hábitos inciales del usuario")
                        return res.redirect('/inicio')
                    })
                })
            })
        }
    })
})


app.post('/registrarCigarro', (req,res)=>
{
    con.query('select * from dia where fecha=curdate() and persona_idpersona="'+req.session.usuario+'"', (err,respuestas,fields)=>
    {
        if(respuestas.length == 0)
        {    
            con.query('insert into dia(fecha, cig_consumidos, dinero_gastado, persona_idpersona, primer_cigarro, ultimo_cigarro) values(curdate(), 1, 7, "'+req.session.usuario+'", curtime(), curtime())', (err,respuesta,fields)=>
            {
                if(err)
                {
                    console.log(err)
                    return res.redirect('/inicio')
                }
            })
        }else
        {
            con.query('update dia set cig_consumidos='+respuestas[0].cig_consumidos+' + 1, dinero_gastado='+respuestas[0].dinero_gastado+' + 7, ultimo_cigarro=curtime() where fecha=curdate() and persona_idpersona="'+req.session.usuario+'"', (err,respuesta,field)=>
            {
                if(err)
                {
                    console.log(err)
                    return res.redirect('/inicio')
                }
                con.query('select * from objetivo where persona_idpersona="'+req.session.usuario+'" and status_idstatus=1', (err,resp,fields)=>
                {
                    if(resp.length == 0)
                    {
                        console.log(err)
                        return res.redirect('/inicio')
                    }
                    fActual = Date.parseInt(respuestas[0].fecha)
                    fObjetivo = Date.parseInt(resp[0].fecha_propuesta)
                    
                    if(respuestas.cig_consumidos > resp.cigarros_propuestos)
                    {
                        con.query('update objetivo set status=3 where persona_idpersona="'+req.session.usuario+'" and objetivo_idobjetivo=1', (err,resp,fields)=>
                        {
                            console.log("cigarro registrado")
                            return res.redirect('/inicio')
                        })
                    }

                    if(restaFechas(fActual, fObjetivo) < 0)
                    {
                        con.query('update objetivo set status=2 where persona_idpersona="'+req.session.usuario+'" and objetivo_idobjetivo=1', (err,resp,fields)=>
                        {
                            console.log("cigarro registrado")
                            return res.redirect('/inicio')
                        })
                    }
                    
                })
                
            })
        }
    })
})


app.post('/registrarObjetivo',(req,res)=>
{
    let etiqueta = req.body.etiquetaob
    let cigarros_propuestos = req.body.cpropuestos
    let fecha_propuesta = req.body.FPlaneada
    let metodo = req.body.metodosp

    con.query(`insert into objetivo(etiqueta, cigarros_propuestos, fecha_propuesta, fecha_inicial, metodo_idmetodo, status_idstatus, persona_idpersona) values("`+
        etiqueta+'", '+cigarros_propuestos+', "'+fecha_propuesta+'", curdate(), '+metodo+', '+ 1 +', "'+req.session.usuario+'")', (err,respuestas,fields)=>
    {
        if(err)
        {
            console.log(err)
            return res.redirect("/")

        }
        console.log("objetivo registrado")
        return res.redirect("/objetivos")
    })
})


//Fin de inserciones post----------------------------------------------------------------------



//Consultas get--------------------------------------------------------------------------------

app.get('/', function(req, res) {
    res.render('InicioSesion')
})


app.get('/inicio', (req, res)=>
{
    if(req.session.usuario)
    {
        usuario = req.session.usuario
        
        let fActualUTC = Date.now()
        let hora = new Date(fActualUTC).getHours()
        let minuto = new Date(fActualUTC).getMinutes()
        let hActualUTC = hora + ":" +minuto

        con.query('select * from dia where persona_idpersona="'+req.session.usuario+'"',(err,respuesta,field)=>
        {
            if(respuesta.length != 0)
            {
                //Dias sin fumar---------------------------------------------------------
                let fechaCig = respuesta[respuesta.length - 1].fecha.toString()
                let horaCig = respuesta[respuesta.length - 1].ultimo_cigarro.toString()
                let f1 = Date.parse(fechaCig)
                let dias = restaFechas(f1, fActualUTC)
                var minutos = restaHoras(horaCig, hActualUTC)

                if(dias != 0)
                {
                    tiempo = dias
                    dato = "dias"
                }else
                {
                    tiempo = minutos
                    dato = "horas"   
                }
                texto = "LLevas "+tiempo+" "+ dato+" sin fumar"
                return res.render('Inicio', {usuario, texto})
            }else
            {
                texto = "No has registrado el consumno de ningún cigarro"
                return res.render('Inicio', {usuario, texto})
            }
        })
    }else
    {
        return res.redirect('/')
    }
})


app.get('/objetivos', (req, res)=>
{
    if(req.session.usuario)
    {
        let fActualUTC = Date.now() + 1000 * 60 * 60 * 24 * 2 
        let anno = new Date(fActualUTC).getFullYear()
        let mes = new Date(fActualUTC).getMonth() + 1
        let dia = new Date(fActualUTC).getDate()
        let fecha = anno + "-" + mes + "-" + dia
        con.query('select * from objetivo where persona_idpersona="'+req.session.usuario+'"',(err,respuesta,field)=>
        {
            let objetivo = ''
            for(let i=0; i < respuesta.length; i++)
            {
                if(respuesta[i].status_idstatus == 1)
                {
                    objetivo = respuesta[i]
                    break
                } 
            }
            if(objetivo!='')
            {
                con.query('select * from metodo where idmetodo='+objetivo.metodo_idmetodo,(error,respuestas,fields)=>
                {
                    let texto = "Tu objetivo es: " + objetivo.etiqueta
                    nombreMetodo = respuestas[0].etiqueta
                    infoMetodo = respuestas[0].informacion
                    listaObjetivos = respuesta
                    let texto2 = 'sinObj'
                    for(let j=0; j < respuesta.length; j++)
                    {
                        if(respuesta[j].status_idstatus != 1)
                        {
                            texto2 = ' '
                            break
                        }
                    }
                    return res.render('Objetivos', {texto, nombreMetodo, infoMetodo, fecha,texto2, listaObjetivos})
                })
            }else
            {
                texto = "No has registrado ningún objetivo"
                nombreMetodo = "vacío"
                infoMetodo = "vacío"
                texto2 = `sinObj`
                con.query('select * from habitos_iniciales where persona_idpersona="'+req.session.usuario+'"',(errores,resp,fiel)=>
                {
                    cig_diarios = resp[0].cig_diarios
                    return res.render('Objetivos', {texto, nombreMetodo, infoMetodo, fecha, cig_diarios, texto2})
                })
            }
        })
    }else
    {
        return res.redirect('/')
    }
})


app.get('/metricas', (req, res)=>
{
    if(req.session.usuario)
    {
        let precioCigarros = 7
        let fActualUTC = Date.now()
        let hora = new Date(fActualUTC).getHours()
        let minuto = new Date(fActualUTC).getMinutes()
        let hActualUTC = hora + ":" +minuto
        con.query('select * from dia where persona_idpersona="'+req.session.usuario+'"',(err,respuesta,field)=>
        {
            con.query('select * from habitos_iniciales where persona_idpersona="'+req.session.usuario+'"',(err,respuestas,fields)=>
            {
                let dineroTeorico
                let dineroGastado
                let dineroAhorrado
                if(respuesta.length != 0)
                {
                    //Dias sin fumar---------------------------------------------------------
                    let fechaCig = respuesta[respuesta.length - 1].fecha.toString()
                    let horaCig = respuesta[respuesta.length - 1].ultimo_cigarro.toString()
                    let f1 = Date.parse(fechaCig)
                    let dias = restaFechas(f1, fActualUTC)
                    var minutos = restaHoras(horaCig, hActualUTC)
                    
                    //Gráfico----------------------------------------------------------------
                    let primerDia = respuesta[0].fecha.toString()
                    let d1 =Date.parse(primerDia)
                    let diasTotales = restaFechas(d1, fActualUTC)
                    let listaDias = [respuesta[0].fecha.getFullYear()+"-"+(parseInt(respuesta[0].fecha.getMonth())+1)+"-"+respuesta[0].fecha.getDate()]
                    let listaCigarros = [respuesta[0].cig_consumidos]

                    dineroTeorico = respuestas[0].cig_diarios * (diasTotales + 2) * precioCigarros
                    dineroGastado = getDineroGastado(respuesta)
                    dineroAhorrado = dineroTeorico - dineroGastado

                    let i = 1
                    let j = 1
                    while(i<diasTotales + 1)
                    {
                        fechaDelDia = Date.parse(respuesta[j].fecha.toString())
                        if(restaFechas(fechaDelDia, fActualUTC) == diasTotales - i)
                        {
                            listaDias.push(respuesta[j].fecha.getFullYear()+"-"+(parseInt(respuesta[0].fecha.getMonth())+1)+"-"+respuesta[j].fecha.getDate())
                            listaCigarros.push(respuesta[j].cig_consumidos)
                            if(j < respuesta.length - 1) j+=1
                        }else
                        {
                            date = new Date(d1 + 1000*60*60*24*i)
                            listaDias.push(date.getFullYear()+"-"+(parseInt(date.getMonth())+1)+"-"+date.getDate())
                            listaCigarros.push(0)
                        }
                        i+=1
                    }

                    if(dias != 0)
                    {
                        tiempo = dias
                        dato = "dias"
                    }else
                    {
                        tiempo = minutos
                        dato = "horas"   
                    }
                    texto = "LLevas "+tiempo+" "+ dato+" sin fumar"
                    return res.render('metricas', {texto, listaDias, listaCigarros, dineroAhorrado})
                }else
                {
                    texto = "No has registrado el consumno de ningún cigarro"
                    listaDias = []
                    listaCigarros = []
                    return res.render('metricas', {texto, listaDias, listaCigarros, dineroAhorrado})
                }
            })
        }) 
    }else
    {
        return res.redirect('/')
    }
})


app.get('/cerrar', (req, res)=>
{
    delete req.session.usuario
    return res.redirect('/')
})

//Fin de consultas get-------------------------------------------------------------------------



//Funciones auxiliares-------------------------------------------------------------------------

function restaFechas(fechaCig, fechaActual)
{
    var dif = fechaActual - fechaCig;
    var dias = Math.floor(dif / (1000 * 60 * 60 * 24));
    return dias;
}

function restaHoras(horaCig, horaActual)
{
    hCig = horaCig.split(':')
    hActual = horaActual.split(':')
    var minutos = parseInt(hActual[1]) - parseInt(hCig[1])
    if(minutos >= 0)
    {
        horas = parseInt(hActual[0]) - parseInt(hCig[0])
        if(minutos > 9) return horas + ":" + minutos
        else return horas + ":0" + minutos
    }else
    {
        minutos = 60 - parseInt(hCig[1]) + parseInt(hActual[1])
        if(minutos < 60)
        {
            horas = parseInt(hActual[0]) - parseInt(hCig[0]) - 1
            if(minutos > 9) return horas + ":" + minutos
            else return horas + ":0" + minutos
        }else
        {
            minutos = minutos - 60
            horas = parseInt(hActual[0]) - parseInt(hCig[0]) +1
            if(minutos > 9) return horas + ":" + minutos
            else return horas + ":0" + minutos
        }
    } 
}

function getDineroGastado(arreglo)
{
    let dinero = 0
    for(let i=0; i< arreglo.length; i++)
    {
        dinero += parseInt(arreglo[i].dinero_gastado)
    }
    return dinero
}

/*
app.get('/metricas', (req, res)=>
{
    if(req.session.usuario)
    {
        let precioCigarros = 7
        let fActualUTC = Date.now()
        let hora = new Date(fActualUTC).getHours()
        let minuto = new Date(fActualUTC).getMinutes()
        let hActualUTC = hora + ":" +minuto
        con.query('select * from dia where persona_idpersona="'+req.session.usuario+'"',(err,respuesta,field)=>
        {
            con.query('select * from habitos_iniciales where persona_idpersona="'+req.session.usuario+'"',(err,respuestas,fields)=>
            {
                let dineroTeorico
                let dineroGastado
                let dineroAhorrado
                if(respuesta.length != 0)
                {
                    //Dias sin fumar---------------------------------------------------------
                    let fechaCig = respuesta[respuesta.length - 1].fecha.toString()
                    let horaCig = respuesta[respuesta.length - 1].ultimo_cigarro.toString()
                    let f1 = Date.parse(fechaCig)
                    let dias = restaFechas(f1, fActualUTC)
                    var minutos = restaHoras(horaCig, hActualUTC)
                    
                    //Gráfico----------------------------------------------------------------
                    let primerDia = respuesta[0].fecha.toString()
                    let d1 =Date.parse(primerDia)
                    let diasTotales = restaFechas(d1, fActualUTC)
                    let listaDias = [respuesta[0].fecha.getFullYear()+"-"+(parseInt(respuesta[0].fecha.getMonth())+1)+"-"+respuesta[0].fecha.getDate()]
                    let listaCigarros = [respuesta[0].cig_consumidos]

                    dineroTeorico = respuestas[0].cig_diarios * (diasTotales + 2) * precioCigarros
                    dineroGastado = getDineroGastado(respuesta)
                    dineroAhorrado = dineroTeorico - dineroGastado

                    let i = 1
                    let j = 1
                    while(i<diasTotales + 1)
                    {
                        fechaDelDia = Date.parse(respuesta[j].fecha.toString())
                        if(restaFechas(fechaDelDia, fActualUTC) == diasTotales - i)
                        {
                            listaDias.push(respuesta[j].fecha.getFullYear()+"-"+(parseInt(respuesta[0].fecha.getMonth())+1)+"-"+respuesta[j].fecha.getDate())
                            listaCigarros.push(respuesta[j].cig_consumidos)
                            if(j < respuesta.length - 1) j+=1
                        }else
                        {
                            date = new Date(d1 + 1000*60*60*24*i)
                            listaDias.push(date.getFullYear()+"-"+(parseInt(date.getMonth())+1)+"-"+date.getDate())
                            listaCigarros.push(0)
                        }
                        i+=1
                    }

                    if(dias != 0)
                    {
                        tiempo = dias
                        dato = "dias"
                    }else
                    {
                        tiempo = minutos
                        dato = "horas"   
                    }
                    texto = "LLevas "+tiempo+" "+ dato+" sin fumar"
                    return res.render('metricas', {texto, listaDias, listaCigarros, dineroAhorrado})
                }else
                {
                    texto = "No has registrado el consumno de ningún cigarro"
                    listaDias = []
                    listaCigarros = []
                    return res.render('metricas', {texto, listaDias, listaCigarros, dineroAhorrado})
                }
            })
        }) 
    }else
    {
        return res.redirect('/')
    }
})
*/