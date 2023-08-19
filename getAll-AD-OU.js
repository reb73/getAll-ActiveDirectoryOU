const ActiveDirectory = require("activedirectory2");
const { StatusCodes: HttpStatus } = require("http-status-codes")

async getAllOUAndWithinUsers(req, res, next) {
        try {
            const domainName = "Your Domain URL"
            const domainUser = "Domain Admin Username"
            const domainPass = "Domain Admin Password"
            baseDN = domainName.split(".");
            const ad = new ActiveDirectory({
                url: `ldap://${domainName}`,
                baseDN: `dc=${baseDN[0]},dc=${baseDN[1]}`,
                username: `${domainUser}@${domainName}`,
                password: domainPass,
            })
            ad.find('ou=*', function (err, results) {
                if (err) {
                    console.log('ERROR: ' + JSON.stringify(err));
                    return;
                }
                if (results) {
                    const obj = Object.values(results)
                    const organizationalUnits = obj[2]
                    const allOUs = organizationalUnits.map(ou => {
                        ou = ou.dn;
                        const allOU = ou.split(",").find(substring => substring.startsWith('OU=')).split('=')[1];
                        return allOU;
                    });
                    async function getUsers() {
                        let ouData = []
                        
                        const baseDN = domainName.split(".")
                        for (const ou of allOUs) {
                            try {
                                const allUserData = await new Promise((resolve, reject) => {
                                    ad.find(
                                        {
                                            filter: 'objectCategory=user',
                                            baseDN: `OU=${ou}, DC=${baseDN[0]}, DC=${baseDN[1]}`
                                        },
                                        (err, user) => {
                                            if (err) {
                                                reject(err);
                                            } else {
                                                resolve(user);
                                            }
                                        }
                                    );
                                });
                                const allUsers = allUserData?.users
                                const dcUsers = allUsers?.map(user => {
                                    return ({
                                        username: user.sAMAccountName,
                                        firstname: user.givenName??undefined,
                                        lastname: user.sn??undefined,
                                        email: user.mail??undefined,
                                        displayname: user.displayName??undefined,
                                        description: user.description??undefined
                                    })
                                })
                                ouData.push({
                                    ou: ou,
                                    users: dcUsers
                                })
                            } catch (err) {
                                console.log(err);
                            }
                        }
                        return res.status(HttpStatus.OK).json({
                            StatusCode: HttpStatus.OK,
                            data: {
                                ouData
                            }
                        });
                    }
                    getUsers();
                }
                else {
                    res.status(HttpStatus.BAD_GATEWAY).json({
                        StatusCode: HttpStatus.BAD_GATEWAY,
                        errors: {
                            message: "ارتباط با سرور دامین دارای مشکل می باشد"
                        }
                    });
                }
            });
        } catch (error) {
            next(error)
        }
    }
