const { execSync } = require('child_process');

module.exports = function (cmdln) {
    let cwd = '.';
    return cmdln.split(/[\r\n]+/g).filter(cmd => cmd).map(cmd => { return {cmd: cmd, status: 0, error: null}; }).find(cmd => {
        try {
            console.log(cmd.cmd);
            if (cmd.cmd.startsWith('cd ')) {
                cwd = cmd.cmd.substr(3);
            }
            else {
                execSync(cmd.cmd, { cwd });
            }
            return false;
        }
        catch (ex) {
            cmd.status = ex.status;
            cmd.error = ex.message;
            return true;
        }
    }) || null;
}
