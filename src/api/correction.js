const response = {
    error: false,
    success: false, 
    message: '',
    data: []
}
class CorrectionRep{
    
    async RecupCorrection (id_concours){

            const response = await fetch(`https://api.result.ml&id=${id_concours}`);

            return response;
        
    }

    
}