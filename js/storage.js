/* =========================================================
   GovInnovate — storage.js
   Thin persistence layer over localStorage.
   ========================================================= */

const STORAGE_KEY = "govinnovate_db_v1";

const Storage = {
  load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      console.error("GovInnovate: failed to read storage", e);
      return null;
    }
  },
  save(db){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return true;
    }catch(e){
      console.error("GovInnovate: failed to persist storage", e);
      return false;
    }
  },
  clear(){
    localStorage.removeItem(STORAGE_KEY);
  }
};
